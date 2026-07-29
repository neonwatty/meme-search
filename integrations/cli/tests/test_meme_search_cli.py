from __future__ import annotations

import io
import json
import tempfile
import threading
import unittest
import urllib.error
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest import mock

import meme_search_cli
from meme_search_cli import (
    _validate_search_payload,
    CliError,
    MemeSearchClient,
    content_path,
    main,
    normalize_base_url,
    print_human_results,
)

CONFORMANCE_FIXTURES = (
    Path(__file__).resolve().parents[2]
    / "shared"
    / "search-response-conformance.json"
)


class FakeApiHandler(BaseHTTPRequestHandler):
    requests: list[dict[str, object]] = []

    def do_GET(self) -> None:
        parsed = urllib.parse.urlsplit(self.path)
        self.__class__.requests.append(
            {
                "path": parsed.path,
                "query": urllib.parse.parse_qs(parsed.query),
                "authorization": self.headers.get("Authorization"),
                "accept": self.headers.get("Accept"),
            }
        )
        if self.headers.get("Authorization") != "Bearer test-secret":
            supplied_token = self.headers.get("Authorization", "").removeprefix(
                "Bearer "
            )
            message = (
                f"invalid token {supplied_token}"
                if supplied_token == "reflect-secret"
                else "invalid token"
            )
            status = 403 if supplied_token == "media-only" else 401
            self._json_response(status, {"error": {"message": message}})
            return
        if parsed.path == "/api/v1/search":
            query = urllib.parse.parse_qs(parsed.query).get("q", [""])[0]
            if query == "truncated":
                body = json.dumps({"data": [], "meta": {}}).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body) + 20))
                self.end_headers()
                self.wfile.write(body)
                self.wfile.flush()
                self.close_connection = True
                return
            if query == "malformed":
                body = b"{not-json"
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            if query == "unexpected":
                self._json_response(200, {"data": {}, "meta": []})
                return
            if query == "cross-origin":
                self._json_response(
                    200,
                    {
                        "data": [
                            {
                                "id": 42,
                                "filename": "ship-it.gif",
                                "description": None,
                                "tags": [],
                                "media_type": "image/gif",
                                "content_url": "https://attacker.example/steal",
                            }
                        ],
                        "meta": {
                            "query": query,
                            "mode": "keyword",
                            "tags": [],
                            "count": 1,
                            "limit": 10,
                        },
                    },
                )
                return
            self._json_response(
                200,
                {
                    "data": [
                        {
                            "id": 42,
                            "filename": "ship-it.gif",
                            "description": "A celebratory launch",
                            "tags": ["deploy", "success"],
                            "media_type": "image/gif",
                            "content_url": "/api/v1/memes/42/content",
                        }
                    ],
                    "meta": {
                        "query": query,
                        "mode": urllib.parse.parse_qs(parsed.query).get(
                            "mode", ["keyword"]
                        )[0],
                        "tags": urllib.parse.parse_qs(parsed.query).get("tag", []),
                        "count": 1,
                        "limit": int(
                            urllib.parse.parse_qs(parsed.query).get("limit", ["10"])[0]
                        ),
                    },
                },
            )
            return
        if parsed.path == "/api/v1/memes/42/content":
            body = b"GIF89a-test"
            self.send_response(200)
            self.send_header("Content-Type", "image/gif")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if parsed.path == "/api/v1/memes/99/content":
            self.send_response(302)
            self.send_header("Location", "/api/v1/captured")
            self.end_headers()
            return
        if parsed.path == "/api/v1/memes/98/content":
            body = b"<html>not media</html>"
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if parsed.path == "/api/v1/memes/97/content":
            body = b"GIF89a-truncated"
            self.send_response(200)
            self.send_header("Content-Type", "image/gif")
            self.send_header("Content-Length", str(len(body) + 50))
            self.end_headers()
            self.wfile.write(body)
            self.wfile.flush()
            self.close_connection = True
            return
        self._json_response(404, {"error": "not found"})

    def log_message(self, _format: str, *_args: object) -> None:
        pass

    def _json_response(self, status: int, payload: object) -> None:
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class CliTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), FakeApiHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        host, port = cls.server.server_address
        cls.base_url = f"http://{host}:{port}"

    @classmethod
    def tearDownClass(cls) -> None:
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def setUp(self) -> None:
        FakeApiHandler.requests.clear()

    def test_shared_search_response_conformance_fixtures(self) -> None:
        fixtures = json.loads(CONFORMANCE_FIXTURES.read_text(encoding="utf-8"))

        for fixture in fixtures["valid"]:
            with self.subTest(fixture=fixture["name"]):
                _validate_search_payload(fixture["payload"], self.base_url)

        for fixture in fixtures["invalid"]:
            with self.subTest(fixture=fixture["name"]):
                with self.assertRaisesRegex(
                    CliError, "unexpected search response|relative path"
                ):
                    _validate_search_payload(fixture["payload"], self.base_url)

    def test_search_sends_bearer_token_and_repeated_tags(self) -> None:
        client = MemeSearchClient(self.base_url, "test-secret")

        payload = client.search(
            "ship it",
            mode="vector",
            tags=["deploy", "success"],
            limit=5,
        )

        self.assertEqual(42, payload["data"][0]["id"])
        request = FakeApiHandler.requests[0]
        self.assertEqual("/api/v1/search", request["path"])
        self.assertEqual(["ship it"], request["query"]["q"])
        self.assertEqual(["vector"], request["query"]["mode"])
        self.assertEqual(["deploy", "success"], request["query"]["tag"])
        self.assertEqual(["5"], request["query"]["limit"])
        self.assertEqual("Bearer test-secret", request["authorization"])
        self.assertEqual("application/json", request["accept"])

    def test_json_output_is_script_friendly(self) -> None:
        stdout = io.StringIO()
        stderr = io.StringIO()

        result = main(
            ["--url", self.base_url, "search", "ship it", "--json"],
            environ={"MEME_SEARCH_API_TOKEN": "test-secret"},
            stdout=stdout,
            stderr=stderr,
        )

        self.assertEqual(0, result)
        self.assertEqual(42, json.loads(stdout.getvalue())["data"][0]["id"])
        self.assertEqual("", stderr.getvalue())

    def test_human_output_includes_fetchable_content_url(self) -> None:
        stdout = io.StringIO()

        result = main(
            ["--url", self.base_url, "search", "ship it"],
            environ={"MEME_SEARCH_API_TOKEN": "test-secret"},
            stdout=stdout,
            stderr=io.StringIO(),
        )

        self.assertEqual(0, result)
        self.assertIn("[42] ship-it.gif", stdout.getvalue())
        self.assertIn("/api/v1/memes/42/content", stdout.getvalue())

    def test_fetch_streams_to_destination_and_refuses_overwrite(self) -> None:
        client = MemeSearchClient(self.base_url, "test-secret")
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / "ship-it.gif"

            byte_count = client.fetch("42", destination)

            self.assertEqual(len(b"GIF89a-test"), byte_count)
            self.assertEqual(b"GIF89a-test", destination.read_bytes())
            with self.assertRaisesRegex(CliError, "already exists"):
                client.fetch("/api/v1/memes/42/content", destination)

    def test_fetch_force_replaces_regular_file(self) -> None:
        client = MemeSearchClient(self.base_url, "test-secret")
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / "ship-it.gif"
            destination.write_bytes(b"old")

            client.fetch("42", destination, force=True)

            self.assertEqual(b"GIF89a-test", destination.read_bytes())

    def test_truncated_search_and_media_responses_fail_without_artifacts(self) -> None:
        stderr = io.StringIO()
        result = main(
            ["--url", self.base_url, "search", "truncated"],
            environ={"MEME_SEARCH_API_TOKEN": "test-secret"},
            stdout=io.StringIO(),
            stderr=stderr,
        )

        self.assertEqual(1, result)
        self.assertIn("interrupted", stderr.getvalue())
        self.assertNotIn("Traceback", stderr.getvalue())
        self.assertNotIn("test-secret", stderr.getvalue())

        client = MemeSearchClient(self.base_url, "test-secret")
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / "truncated.gif"

            with self.assertRaisesRegex(CliError, "incomplete"):
                client.fetch("97", destination)

            self.assertFalse(destination.exists())
            self.assertEqual([], list(Path(directory).glob(".*.download")))

    def test_no_force_commit_does_not_clobber_a_concurrent_destination(self) -> None:
        client = MemeSearchClient(self.base_url, "test-secret")
        copy_finished = threading.Event()
        allow_commit = threading.Event()
        failures: list[Exception] = []
        original_copy = meme_search_cli._copy_stream

        def blocking_copy(*args: object, **kwargs: object) -> int:
            byte_count = original_copy(*args, **kwargs)
            copy_finished.set()
            if not allow_commit.wait(timeout=2):
                raise RuntimeError("test barrier timed out")
            return byte_count

        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / "raced.gif"

            def download() -> None:
                try:
                    client.fetch("42", destination)
                except Exception as error:  # capture the worker-thread result
                    failures.append(error)

            with mock.patch(
                "meme_search_cli._copy_stream",
                side_effect=blocking_copy,
            ):
                thread = threading.Thread(target=download)
                thread.start()
                self.assertTrue(copy_finished.wait(timeout=2))
                destination.write_bytes(b"concurrent winner")
                allow_commit.set()
                thread.join(timeout=2)

            self.assertFalse(thread.is_alive())
            self.assertEqual(b"concurrent winner", destination.read_bytes())
            self.assertEqual(1, len(failures))
            self.assertIsInstance(failures[0], CliError)
            self.assertIn("already exists", str(failures[0]))
            self.assertEqual([], list(Path(directory).glob(".*.download")))

    def test_force_replacement_is_atomic_and_explicit(self) -> None:
        client = MemeSearchClient(self.base_url, "test-secret")
        replacement_ready = threading.Event()
        allow_replacement = threading.Event()
        failures: list[Exception] = []
        original_replace = meme_search_cli.os.replace

        def blocking_replace(source: Path, destination: Path) -> None:
            replacement_ready.set()
            if not allow_replacement.wait(timeout=2):
                raise RuntimeError("test barrier timed out")
            original_replace(source, destination)

        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / "forced.gif"
            destination.write_bytes(b"old complete file")

            def download() -> None:
                try:
                    client.fetch("42", destination, force=True)
                except Exception as error:  # capture the worker-thread result
                    failures.append(error)

            with mock.patch("meme_search_cli.os.replace", side_effect=blocking_replace):
                thread = threading.Thread(target=download)
                thread.start()
                self.assertTrue(replacement_ready.wait(timeout=2))
                self.assertEqual(b"old complete file", destination.read_bytes())
                allow_replacement.set()
                thread.join(timeout=2)

            self.assertFalse(thread.is_alive())
            self.assertEqual([], failures)
            self.assertEqual(b"GIF89a-test", destination.read_bytes())
            self.assertEqual([], list(Path(directory).glob(".*.download")))

    def test_fetch_refuses_symlink_even_with_force(self) -> None:
        client = MemeSearchClient(self.base_url, "test-secret")
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "target.gif"
            target.write_bytes(b"do not replace")
            symlink = Path(directory) / "output.gif"
            try:
                symlink.symlink_to(target)
            except (NotImplementedError, OSError):
                self.skipTest("symlinks are not supported")

            with self.assertRaisesRegex(CliError, "symlink"):
                client.fetch("42", symlink, force=True)

            self.assertEqual(b"do not replace", target.read_bytes())

    def test_fetch_does_not_follow_redirects_with_bearer_token(self) -> None:
        client = MemeSearchClient(self.base_url, "test-secret")
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(CliError, "HTTP 302"):
                client.fetch("99", Path(directory) / "redirected.gif")

        self.assertEqual(
            ["/api/v1/memes/99/content"],
            [request["path"] for request in FakeApiHandler.requests],
        )

    def test_server_error_is_concise_and_does_not_leak_token(self) -> None:
        client = MemeSearchClient(self.base_url, "wrong-secret")

        with self.assertRaises(CliError) as raised:
            client.search("ship it")

        self.assertIn("HTTP 401: invalid token", str(raised.exception))
        self.assertNotIn("wrong-secret", str(raised.exception))

    def test_server_error_redacts_a_reflected_token(self) -> None:
        client = MemeSearchClient(self.base_url, "reflect-secret")

        with self.assertRaises(CliError) as raised:
            client.search("ship it")

        self.assertIn("[REDACTED]", str(raised.exception))
        self.assertNotIn("reflect-secret", str(raised.exception))

    def test_scope_error_is_concise_and_nonzero(self) -> None:
        stderr = io.StringIO()

        result = main(
            ["--url", self.base_url, "search", "ship it"],
            environ={"MEME_SEARCH_API_TOKEN": "media-only"},
            stdout=io.StringIO(),
            stderr=stderr,
        )

        self.assertEqual(1, result)
        self.assertIn("HTTP 403", stderr.getvalue())
        self.assertNotIn("media-only", stderr.getvalue())

    def test_malformed_and_unexpected_search_responses_fail_safely(self) -> None:
        client = MemeSearchClient(self.base_url, "test-secret")

        with self.assertRaisesRegex(CliError, "invalid JSON"):
            client.search("malformed")
        with self.assertRaisesRegex(CliError, "unexpected search response"):
            client.search("unexpected")
        with self.assertRaisesRegex(CliError, "relative path"):
            client.search("cross-origin")

    def test_human_output_strips_terminal_control_characters(self) -> None:
        output = io.StringIO()

        print_human_results(
            {
                "data": [
                    {
                        "id": 42,
                        "filename": "safe\x1b[31m.gif\nnext-line",
                        "description": "description\rrewritten",
                        "tags": ["tag\tname"],
                        "content_url": "/api/v1/memes/42/content",
                    }
                ]
            },
            output,
        )

        rendered = output.getvalue()
        self.assertNotIn("\x1b", rendered)
        self.assertNotIn("\r", rendered)
        self.assertIn("safe [31m.gif next-line", rendered)
        self.assertIn("next-line", rendered.splitlines()[0])

    def test_timeout_and_network_errors_are_actionable_and_secret_safe(self) -> None:
        client = MemeSearchClient(self.base_url, "test-secret")

        client.opener = mock.Mock()
        client.opener.open.side_effect = TimeoutError()
        with self.assertRaisesRegex(CliError, "timed out"):
            client.search("ship it")

        client.opener.open.side_effect = urllib.error.URLError(
            "connection refused for test-secret"
        )
        with self.assertRaises(CliError) as raised:
            client.search("ship it")
        self.assertIn("could not connect", str(raised.exception))
        self.assertIn("[REDACTED]", str(raised.exception))
        self.assertNotIn("test-secret", str(raised.exception))

    def test_token_is_required(self) -> None:
        stderr = io.StringIO()

        result = main(
            ["--url", self.base_url, "search", "ship it"],
            environ={},
            stdout=io.StringIO(),
            stderr=stderr,
        )

        self.assertEqual(1, result)
        self.assertIn("MEME_SEARCH_API_TOKEN is required", stderr.getvalue())

    def test_instance_url_can_come_from_supplied_environment(self) -> None:
        stdout = io.StringIO()

        result = main(
            ["search", "ship it", "--json"],
            environ={
                "MEME_SEARCH_API_TOKEN": "test-secret",
                "MEME_SEARCH_URL": self.base_url,
            },
            stdout=stdout,
            stderr=io.StringIO(),
        )

        self.assertEqual(0, result)
        self.assertEqual(42, json.loads(stdout.getvalue())["data"][0]["id"])

    def test_plain_http_remote_url_is_rejected(self) -> None:
        with self.assertRaisesRegex(CliError, "plain HTTP"):
            normalize_base_url("http://example.com:3000")

        self.assertEqual("https://example.com", normalize_base_url("https://example.com/"))

    def test_url_with_credentials_or_path_is_rejected(self) -> None:
        with self.assertRaisesRegex(CliError, "credentials"):
            normalize_base_url("https://user:secret@example.com")
        with self.assertRaisesRegex(CliError, "without a path"):
            normalize_base_url("https://example.com/meme-search")

    def test_content_path_rejects_absolute_or_ambiguous_targets(self) -> None:
        self.assertEqual("/api/v1/memes/12/content", content_path("12"))
        self.assertEqual(
            "/api/v1/memes/12/content",
            content_path("/api/v1/memes/12/content"),
        )
        with self.assertRaises(CliError):
            content_path("https://attacker.example/content")
        with self.assertRaises(CliError):
            content_path("zero")
        with self.assertRaisesRegex(CliError, "meme content route"):
            client = MemeSearchClient(self.base_url, "test-secret")
            client.fetch(
                "/api/v1/memes/12/content?redirect=https://attacker.example",
                Path("not-created"),
            )

    def test_fetch_rejects_non_content_api_path(self) -> None:
        client = MemeSearchClient(self.base_url, "test-secret")
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(CliError, "meme content route"):
                client.fetch(
                    "/api/v1/search",
                    Path(directory) / "not-media",
                )

    def test_fetch_rejects_non_media_response_and_missing_directory(self) -> None:
        client = MemeSearchClient(self.base_url, "test-secret")
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(CliError, "unexpected media type"):
                client.fetch("98", Path(directory) / "not-media")
            self.assertFalse((Path(directory) / "not-media").exists())

            missing_parent = Path(directory) / "missing" / "output.gif"
            with self.assertRaisesRegex(CliError, "directory does not exist"):
                client.fetch("42", missing_parent)


if __name__ == "__main__":
    unittest.main()
