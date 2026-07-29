require "test_helper"

class ImageSearchQueryTest < ActiveSupport::TestCase
  test "performs keyword search with the existing result limit" do
    results = ImageSearchQuery.new(query: "bunny", mode: "keyword").call

    assert_equal [ image_cores(:three) ], results
    assert_operator results.length, :<=, ImageSearchQuery::DEFAULT_RESULT_LIMIT
  end

  test "removes stopwords before keyword search" do
    results = ImageSearchQuery.new(query: "this bunny", mode: "0").call

    assert_equal [ image_cores(:three) ], results.to_a
  end

  test "filters keyword results by any selected tag" do
    results = ImageSearchQuery.new(
      query: "image",
      mode: "keyword",
      selected_tag_names: [ "tag_one" ]
    ).call

    expected_ids = [ image_cores(:one).id, image_cores(:two).id ].sort
    assert_equal expected_ids, results.map(&:id).sort
  end

  test "filters keyword results before applying the result limit" do
    matching_tag = tag_names(:two)
    untagged = image_cores(:one)
    tagged = image_cores(:three)
    tagged.image_tags.create!(tag_name: matching_tag) unless tagged.image_tags.exists?(tag_name: matching_tag)
    ranked_relation = ImageCore.where(id: [ untagged.id, tagged.id ]).order(:id)

    ImageCore.stub(:search_any_word, ranked_relation) do
      results = ImageSearchQuery.new(
        query: "image",
        mode: "keyword",
        selected_tag_names: [ matching_tag.name ],
        limit: 1
      ).call

      assert_equal [ tagged ], results
    end
  end

  test "performs vector search through the embedding boundary" do
    query_embedding = Minitest::Mock.new
    query_embedding.expect(:compute_embedding, Array.new(384, 0.5))
    query_embedding.expect(
      :get_neighbor_image_core_ids,
      [ image_cores(:three).id, image_cores(:one).id ],
      limit: 10,
      image_core_ids: nil
    )

    ImageEmbedding.stub(:new, query_embedding) do
      results = ImageSearchQuery.new(query: "reaction meme", mode: "vector").call

      assert_equal [ image_cores(:three), image_cores(:one) ], results
    end

    query_embedding.verify
  end

  test "passes the tag filter into vector neighbor selection before its limit" do
    query_embedding = Object.new
    captured = {}
    tagged_image_core_id = image_cores(:three).id
    query_embedding.define_singleton_method(:compute_embedding) { Array.new(384, 0.5) }
    query_embedding.define_singleton_method(:get_neighbor_image_core_ids) do |limit:, image_core_ids:|
      captured[:limit] = limit
      captured[:eligible_ids] = image_core_ids.to_a.map(&:id)
      [ tagged_image_core_id ]
    end

    ImageEmbedding.stub(:new, query_embedding) do
      results = ImageSearchQuery.new(
        query: "reaction meme",
        mode: "vector",
        selected_tag_names: [ "tag_two" ],
        limit: 1
      ).call

      assert_equal 1, captured[:limit]
      assert_includes captured[:eligible_ids], image_cores(:three).id
      assert_not_includes captured[:eligible_ids], image_cores(:one).id
      assert_equal [ image_cores(:three) ], results
    end
  end

  test "image embedding limits distinct memes after ranking duplicate embeddings" do
    first_image = image_cores(:one)
    second_image = image_cores(:two)
    query_vector = [ 1.0 ] + Array.new(383, 0.0)
    ImageEmbedding.create!(
      image_core: first_image,
      snippet: "exact duplicate one",
      embedding: query_vector
    )
    ImageEmbedding.create!(
      image_core: first_image,
      snippet: "near duplicate one",
      embedding: [ 0.99, 0.01 ] + Array.new(382, 0.0)
    )
    ImageEmbedding.create!(
      image_core: second_image,
      snippet: "second distinct meme",
      embedding: [ 0.8, 0.2 ] + Array.new(382, 0.0)
    )
    query_embedding = ImageEmbedding.new(
      image_core: first_image,
      snippet: "query",
      embedding: query_vector
    )
    eligible_ids = ImageCore.where(id: [ first_image.id, second_image.id ]).select(:id)

    results = query_embedding.get_neighbor_image_core_ids(limit: 2, image_core_ids: eligible_ids)

    assert_equal [ first_image.id, second_image.id ], results
  end

  test "vector search uses a bounded number of database queries" do
    query_embedding = ImageEmbedding.new(
      image_core: image_cores(:one),
      snippet: "reaction",
      embedding: image_embeddings(:one).embedding
    )
    sql_queries = []
    subscriber = lambda do |_name, _started, _finished, _unique_id, payload|
      sql_queries << payload[:sql] unless payload[:cached] || payload[:name] == "SCHEMA"
    end

    ImageEmbedding.stub(:new, query_embedding) do
      ActiveSupport::Notifications.subscribed(subscriber, "sql.active_record") do
        ImageSearchQuery.new(query: "reaction", mode: "vector", limit: 2).call
      end
    end

    assert_operator sql_queries.length, :<=, 3, sql_queries.join("\n")
  end

  test "returns no results for an unsupported mode" do
    results = ImageSearchQuery.new(query: "bunny", mode: "unsupported").call

    assert_empty results
  end

  test "clamps caller supplied limits" do
    results = ImageSearchQuery.new(query: "image", mode: "keyword", limit: 100).call

    assert_operator results.length, :<=, ImageSearchQuery::MAX_RESULT_LIMIT
  end
end
