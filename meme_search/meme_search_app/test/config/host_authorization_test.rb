require "test_helper"

class HostAuthorizationTest < ActiveSupport::TestCase
  test "built in hosts are limited to loopback and required Docker names" do
    hosts = MemeSearch::HostAuthorization.allowed_hosts(extra_hosts: nil)

    assert_includes hosts, "localhost"
    assert_includes hosts, "meme_search"
    assert_includes hosts, "rails-app"
    assert_includes hosts, "host.docker.internal"
    assert hosts.grep(IPAddr).any? { |host| host.include?(IPAddr.new("127.0.0.1")) }
    assert hosts.grep(IPAddr).any? { |host| host.include?(IPAddr.new("::1")) }
    assert_not_includes hosts, "attacker.example"
  end

  test "extra proxy hosts require exact explicit values" do
    hosts = MemeSearch::HostAuthorization.allowed_hosts(
      extra_hosts: "memes.example.internal, 192.0.2.10"
    )

    assert_includes hosts, "memes.example.internal"
    assert hosts.grep(IPAddr).any? { |host| host == IPAddr.new("192.0.2.10") }
  end

  test "wildcards subdomain patterns URLs and ports are rejected" do
    [
      "*.example.com",
      ".example.com",
      "https://example.com",
      "example.com:3000",
      "192.0.2.0/24"
    ].each do |value|
      assert_raises(ArgumentError) do
        MemeSearch::HostAuthorization.allowed_hosts(extra_hosts: value)
      end
    end
  end
end
