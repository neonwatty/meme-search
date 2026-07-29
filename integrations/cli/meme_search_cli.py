#!/usr/bin/env python3
"""Zero-dependency command-line client for the Meme Search API."""

from __future__ import annotations

import argparse
import http.client
import ipaddress
import json
import os
import re
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, BinaryIO, Mapping, Sequence, TextIO


DEFAULT_URL = "http://127.0.0.1:3000"
DEFAULT_TIMEOUT = 15.0
DEFAULT_LIMIT = 10
MAX_LIMIT = 20
USER_AGENT = "meme-search-cli/0.1"
TOKEN_ENV = "MEME_SEARCH_API_TOKEN"
URL_ENV = "MEME_SEARCH_URL"


class CliError(Exception):
    """An expected, user-actionable CLI error."""


class _NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Keep bearer credentials from following redirects to another origin."""

    def redirect_request(
        self,
        req: urllib.request.Request,
        fp: BinaryIO,
        code: int,
        msg: str,
        headers: Mapping[str, str],
        newurl: str,
    ) -> None:
        return None


def _is_loopback(hostname: str | None) -> bool:
    if not hostname:
        return False
    if hostname.lower() == "localhost":
        return True
    try:
        return ipaddress.ip_address(hostname).is_loopback
    except ValueError:
        return False


def normalize_base_url(value: str) -> str:
    """Validate an API origin and return it without a trailing slash."""
    parsed = urllib.parse.urlsplit(value.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise CliError("instance URL must be an http:// or https:// origin")
    if parsed.username or parsed.password:
        raise CliError("instance URL must not contain credentials")
    if parsed.query or parsed.fragment:
        raise CliError("instance URL must not contain a query or fragment")
    if parsed.path not in {"", "/"}:
        raise CliError("instance URL must be an origin without a path")
    try:
        port = parsed.port
    except ValueError as error:
        raise CliError("instance URL contains an invalid port") from error
    if parsed.scheme == "http" and not _is_loopback(parsed.hostname):
        raise CliError(
            "plain HTTP is only allowed for loopback instances; use HTTPS for remote hosts"
        )

    hostname = parsed.hostname
    assert hostname is not None
    display_host = f"[{hostname}]" if ":" in hostname else hostname
    authority = display_host if port is None else f"{display_host}:{port}"
    return f"{parsed.scheme}://{authority}"


def _relative_api_url(base_url: str, relative_path: str) -> str:
    """Resolve a server-provided API path without allowing token exfiltration."""
    parsed = urllib.parse.urlsplit(relative_path)
    if parsed.scheme or parsed.netloc or not relative_path.startswith("/"):
        raise CliError("content URL must be a relative path from this Meme Search instance")
    if parsed.query or parsed.fragment or not re.fullmatch(
        r"/api/v1/memes/[1-9][0-9]*/content", parsed.path
    ):
        raise CliError("content URL must point to a v1 meme content route")
    return f"{base_url}{relative_path}"


def _message_from_http_error(error: urllib.error.HTTPError) -> str:
    detail = ""
    try:
        body = error.read(32_768)
        payload = json.loads(body.decode("utf-8"))
        if isinstance(payload, Mapping):
            candidate = payload.get("error") or payload.get("message")
            if isinstance(candidate, str):
                detail = candidate.strip()
            elif isinstance(candidate, Mapping):
                nested = candidate.get("message")
                if isinstance(nested, str):
                    detail = nested.strip()
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        pass
    suffix = f": {detail}" if detail else ""
    return f"API request failed with HTTP {error.code}{suffix}"


def _redact_secret(message: str, secret: str) -> str:
    if not secret:
        return message
    return message.replace(secret, "[REDACTED]")


class MemeSearchClient:
    """Small urllib-based client for the read-only v1 API."""

    def __init__(self, base_url: str, token: str, timeout: float = DEFAULT_TIMEOUT):
        self.base_url = normalize_base_url(base_url)
        self.token = token.strip()
        if not self.token:
            raise CliError(f"{TOKEN_ENV} is required")
        if timeout <= 0:
            raise CliError("timeout must be greater than zero")
        self.timeout = timeout
        self.opener = urllib.request.build_opener(_NoRedirectHandler())

    def _request(self, url: str, accept: str) -> urllib.response.addinfourl:
        request = urllib.request.Request(
            url,
            headers={
                "Accept": accept,
                "Authorization": f"Bearer {self.token}",
                "User-Agent": USER_AGENT,
            },
            method="GET",
        )
        try:
            return self.opener.open(request, timeout=self.timeout)
        except urllib.error.HTTPError as error:
            message = _redact_secret(_message_from_http_error(error), self.token)
            raise CliError(message) from error
        except urllib.error.URLError as error:
            reason = getattr(error, "reason", error)
            if isinstance(reason, TimeoutError):
                raise CliError("Meme Search request timed out") from error
            message = _redact_secret(
                f"could not connect to Meme Search: {reason}",
                self.token,
            )
            raise CliError(message) from error
        except TimeoutError as error:
            raise CliError("Meme Search request timed out") from error

    def search(
        self,
        query: str,
        *,
        mode: str = "keyword",
        tags: Sequence[str] = (),
        limit: int = DEFAULT_LIMIT,
    ) -> dict[str, Any]:
        query = query.strip()
        if not query:
            raise CliError("search query must not be empty")
        if mode not in {"keyword", "vector"}:
            raise CliError("search mode must be keyword or vector")
        if not 1 <= limit <= MAX_LIMIT:
            raise CliError(f"limit must be between 1 and {MAX_LIMIT}")

        parameters: list[tuple[str, str]] = [
            ("q", query),
            ("mode", mode),
            ("limit", str(limit)),
        ]
        parameters.extend(("tag", tag.strip()) for tag in tags if tag.strip())
        url = f"{self.base_url}/api/v1/search?{urllib.parse.urlencode(parameters)}"
        response = self._request(url, "application/json")
        try:
            try:
                body = response.read()
            except (http.client.HTTPException, OSError) as error:
                raise CliError("API response was interrupted before it completed") from error
        finally:
            response.close()
        try:
            payload = json.loads(body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise CliError("API returned invalid JSON") from error
        _validate_search_payload(payload, self.base_url)
        return payload

    def fetch(self, meme_or_content_url: str, destination: Path, *, force: bool = False) -> int:
        relative_path = content_path(meme_or_content_url)
        url = _relative_api_url(self.base_url, relative_path)
        destination = destination.expanduser()
        if destination.is_symlink():
            raise CliError(f"refusing to write through symlink: {destination}")
        if destination.exists() and not force:
            raise CliError(f"output already exists (use --force to replace it): {destination}")
        if destination.exists() and not destination.is_file():
            raise CliError(f"output is not a regular file: {destination}")
        if not destination.parent.is_dir():
            raise CliError(f"output directory does not exist: {destination.parent}")

        response = self._request(url, "image/*,video/*,application/octet-stream")
        temp_path: Path | None = None
        total_bytes = 0
        try:
            content_type = response.headers.get_content_type()
            if not (
                content_type.startswith("image/")
                or content_type == "application/octet-stream"
            ):
                raise CliError(
                    f"API returned an unexpected media type: {content_type}"
                )
            with tempfile.NamedTemporaryFile(
                mode="wb",
                prefix=f".{destination.name}.",
                suffix=".download",
                dir=destination.parent,
                delete=False,
            ) as temporary:
                temp_path = Path(temporary.name)
                total_bytes = _copy_stream(
                    response,
                    temporary,
                    expected_bytes=_content_length(response)
                )
            _commit_download(temp_path, destination, force=force)
            temp_path = None
        except (http.client.HTTPException, OSError) as error:
            raise CliError(f"could not save media to {destination}: {error}") from error
        finally:
            response.close()
            if temp_path is not None:
                try:
                    temp_path.unlink()
                except FileNotFoundError:
                    pass
        return total_bytes


def _validate_search_payload(payload: Any, base_url: str) -> None:
    if not isinstance(payload, dict):
        raise CliError("API returned an unexpected search response")

    data = payload.get("data")
    meta = payload.get("meta")
    if not isinstance(data, list) or not isinstance(meta, Mapping):
        raise CliError("API returned an unexpected search response")

    required_meta = {
        "query": str,
        "mode": str,
        "tags": list,
        "limit": int,
        "count": int,
    }
    for field, expected_type in required_meta.items():
        if not isinstance(meta.get(field), expected_type):
            raise CliError("API returned an unexpected search response")
    if meta["mode"] not in {"keyword", "vector"}:
        raise CliError("API returned an unexpected search response")
    if not all(isinstance(tag, str) for tag in meta["tags"]):
        raise CliError("API returned an unexpected search response")
    if (
        isinstance(meta["limit"], bool)
        or not 1 <= meta["limit"] <= MAX_LIMIT
        or isinstance(meta["count"], bool)
        or not 0 <= meta["count"] <= MAX_LIMIT
    ):
        raise CliError("API returned an unexpected search response")

    for item in data:
        if not isinstance(item, Mapping):
            raise CliError("API returned an unexpected search response")
        meme_id = item.get("id")
        if isinstance(meme_id, bool) or not isinstance(meme_id, int) or meme_id < 1:
            raise CliError("API returned an unexpected search response")
        if not isinstance(item.get("filename"), str):
            raise CliError("API returned an unexpected search response")
        if item.get("description") is not None and not isinstance(
            item.get("description"), str
        ):
            raise CliError("API returned an unexpected search response")
        tags = item.get("tags")
        if not isinstance(tags, list) or not all(isinstance(tag, str) for tag in tags):
            raise CliError("API returned an unexpected search response")
        if not isinstance(item.get("media_type"), str):
            raise CliError("API returned an unexpected search response")
        content_url = item.get("content_url")
        if not isinstance(content_url, str):
            raise CliError("API returned an unexpected search response")
        _relative_api_url(base_url, content_url)


def _content_length(response: urllib.response.addinfourl) -> int | None:
    raw_value = response.headers.get("Content-Length")
    if raw_value is None:
        return None
    try:
        value = int(raw_value)
    except ValueError as error:
        raise CliError("API returned an invalid Content-Length") from error
    if value < 0:
        raise CliError("API returned an invalid Content-Length")
    return value


def _copy_stream(
    source: BinaryIO,
    destination: BinaryIO,
    *,
    expected_bytes: int | None = None,
) -> int:
    total = 0
    while True:
        chunk = source.read(64 * 1024)
        if not chunk:
            break
        destination.write(chunk)
        total += len(chunk)
    if expected_bytes is not None and total != expected_bytes:
        raise CliError(
            f"media download was incomplete (expected {expected_bytes} bytes, received {total})"
        )
    return total


def _commit_download(temp_path: Path, destination: Path, *, force: bool) -> None:
    if force:
        os.replace(temp_path, destination)
        return

    try:
        os.link(temp_path, destination)
    except FileExistsError as error:
        raise CliError(f"output already exists (use --force to replace it): {destination}") from error
    temp_path.unlink()


def content_path(value: str) -> str:
    """Accept either a numeric meme ID or a relative content_url from search."""
    value = value.strip()
    if re.fullmatch(r"[1-9][0-9]*", value):
        return f"/api/v1/memes/{value}/content"
    if value.startswith("/"):
        return value
    raise CliError("fetch target must be a numeric meme ID or a relative content_url")


def _safe_text(value: Any) -> str:
    text = "" if value is None else str(value)
    return "".join(character if character.isprintable() else " " for character in text)


def print_human_results(payload: Mapping[str, Any], output: TextIO) -> None:
    results = payload.get("data", [])
    assert isinstance(results, list)
    if not results:
        print("No memes found.", file=output)
        return

    for index, item in enumerate(results, start=1):
        if not isinstance(item, Mapping):
            continue
        meme_id = _safe_text(item.get("id", "?"))
        filename = _safe_text(item.get("filename", "(unnamed)"))
        print(f"{index}. [{meme_id}] {filename}", file=output)
        description = _safe_text(item.get("description"))
        if description:
            print(f"   {description}", file=output)
        tags = item.get("tags")
        if isinstance(tags, list) and tags:
            print(f"   tags: {', '.join(_safe_text(tag) for tag in tags)}", file=output)
        content_url = _safe_text(item.get("content_url"))
        if content_url:
            print(f"   content: {content_url}", file=output)

    meta = payload.get("meta")
    if isinstance(meta, Mapping):
        shown = len(results)
        count = meta.get("count")
        if isinstance(count, int) and count != shown:
            print(f"\nShowing {shown} of {count} result(s).", file=output)


def build_parser(environ: Mapping[str, str] | None = None) -> argparse.ArgumentParser:
    environment = os.environ if environ is None else environ
    parser = argparse.ArgumentParser(
        prog="meme-search",
        description="Search and download memes from a local Meme Search instance.",
    )
    parser.add_argument(
        "--url",
        default=environment.get(URL_ENV, DEFAULT_URL),
        help=f"instance origin (default: ${URL_ENV} or {DEFAULT_URL})",
    )
    parser.add_argument(
        "--timeout",
        default=DEFAULT_TIMEOUT,
        type=float,
        help=f"request timeout in seconds (default: {DEFAULT_TIMEOUT:g})",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    search_parser = subparsers.add_parser("search", help="search the meme collection")
    search_parser.add_argument("query", help="words or meaning to search for")
    search_parser.add_argument(
        "--mode",
        choices=("keyword", "vector"),
        default="keyword",
        help="search method (default: keyword)",
    )
    search_parser.add_argument(
        "--tag",
        action="append",
        default=[],
        help="require a tag; repeat to supply multiple tags",
    )
    search_parser.add_argument(
        "--limit",
        default=DEFAULT_LIMIT,
        type=int,
        help=f"maximum results, 1-{MAX_LIMIT} (default: {DEFAULT_LIMIT})",
    )
    search_parser.add_argument(
        "--json",
        action="store_true",
        help="print the API response as formatted JSON",
    )

    fetch_parser = subparsers.add_parser("fetch", help="download a meme's media")
    fetch_parser.add_argument(
        "target",
        help="numeric meme ID or relative content_url returned by search",
    )
    fetch_parser.add_argument(
        "--output",
        "-o",
        type=Path,
        required=True,
        help="destination file (parent directory must exist)",
    )
    fetch_parser.add_argument(
        "--force",
        action="store_true",
        help="replace an existing regular file",
    )
    return parser


def main(
    argv: Sequence[str] | None = None,
    *,
    environ: Mapping[str, str] | None = None,
    stdout: TextIO = sys.stdout,
    stderr: TextIO = sys.stderr,
) -> int:
    environment = os.environ if environ is None else environ
    parser = build_parser(environment)
    args = parser.parse_args(argv)
    token = environment.get(TOKEN_ENV, "")
    try:
        client = MemeSearchClient(args.url, token, args.timeout)
        if args.command == "search":
            payload = client.search(
                args.query,
                mode=args.mode,
                tags=args.tag,
                limit=args.limit,
            )
            if args.json:
                json.dump(payload, stdout, indent=2, sort_keys=True)
                stdout.write("\n")
            else:
                print_human_results(payload, stdout)
        elif args.command == "fetch":
            byte_count = client.fetch(args.target, args.output, force=args.force)
            print(f"Saved {byte_count} bytes to {args.output.expanduser()}", file=stdout)
        return 0
    except CliError as error:
        print(f"meme-search: {error}", file=stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
