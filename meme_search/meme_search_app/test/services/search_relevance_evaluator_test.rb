require "test_helper"
require "tempfile"

class SearchRelevanceEvaluatorTest < ActiveSupport::TestCase
  TestResult = Data.define(:id, :relative_path)

  test "computes hit rate reciprocal rank and recall independent of the UI" do
    cases = [
      { "query" => "incident", "expected" => [ { "path" => "work/incident.gif" } ] },
      {
        "query" => "surprise",
        "expected" => [ { "id" => 7 }, { "path" => "reactions/shock.jpg" } ]
      },
      { "query" => "missing", "expected" => [ { "id" => 99 } ] }
    ]
    results = {
      "incident" => [
        TestResult.new(id: 1, relative_path: "other/incident.gif"),
        TestResult.new(id: 2, relative_path: "work/incident.gif")
      ],
      "surprise" => [
        TestResult.new(id: 7, relative_path: "reactions/surprise.jpg"),
        TestResult.new(id: 8, relative_path: "other/unrelated.jpg")
      ],
      "missing" => [ TestResult.new(id: 3, relative_path: "other/missing.jpg") ]
    }
    searcher = ->(test_case, _limit) { results.fetch(test_case.fetch("query")) }

    result = SearchRelevanceEvaluator.new(cases:, searcher:).call(k: 2)

    assert_equal 3, result.metrics["case_count"]
    assert_equal 2, result.metrics["k"]
    assert_in_delta 2.0 / 3, result.metrics["hit_rate"]
    assert_in_delta 0.5, result.metrics["mrr"]
    assert_in_delta 0.5, result.metrics["mean_recall"]
    assert_equal(
      %w[path:other/incident.gif path:work/incident.gif],
      result.case_results.first["returned"]
    )
    assert_equal 0.5, result.case_results.first["reciprocal_rank"]
    assert_equal 0.5, result.case_results.second["recall"]
    assert_equal false, result.case_results.last["hit"]
  end

  test "returns zeroed metrics for an empty dataset" do
    result = SearchRelevanceEvaluator.new(cases: [], searcher: ->(*) { flunk }).call

    assert_equal(
      { "k" => 10, "case_count" => 0, "hit_rate" => 0.0, "mrr" => 0.0, "mean_recall" => 0.0 },
      result.metrics
    )
  end

  test "rejects k values outside the API result bounds" do
    evaluator = SearchRelevanceEvaluator.new(cases: [], searcher: ->(*) { [] })

    [ 0, 21, "10" ].each do |invalid_k|
      assert_raises(ArgumentError) { evaluator.call(k: invalid_k) }
    end
  end

  test "validates dataset shape with actionable case locations" do
    invalid_cases = [
      nil,
      [ "not a mapping" ],
      [ { "query" => "", "expected" => [ { "id" => 1 } ] } ],
      [ { "query" => "reaction", "mode" => "sql", "expected" => [ { "id" => 1 } ] } ],
      [ { "query" => "reaction", "expected" => [] } ],
      [ { "query" => "reaction", "expected" => [ { "id" => 1 } ], "tags" => [ "x" * 21 ] } ],
      [ { "query" => "reaction", "expected" => [ { "id" => nil } ] } ],
      [ { "query" => "reaction", "expected" => [ { "id" => 1, "path" => "work/meme.gif" } ] } ],
      [ { "query" => "reaction", "expected" => [ { "path" => "meme.gif" } ] } ],
      [ { "query" => "reaction", "expected" => [ "meme.gif" ] } ]
    ]

    invalid_cases.each do |cases|
      assert_raises(SearchRelevanceEvaluator::DatasetError) do
        SearchRelevanceEvaluator.new(cases:, searcher: ->(*) { [] })
      end
    end
  end

  test "loads a private dataset and rejects the checked-in template marker" do
    valid_file = Tempfile.new([ "search-relevance-valid", ".yml" ])
    valid_file.write(<<~YAML)
      version: 1
      template_only: false
      cases:
        - query: "reaction"
          expected: ["private-reaction.gif"]
    YAML
    valid_file.flush

    assert_raises(SearchRelevanceEvaluator::DatasetError) do
      SearchRelevanceEvaluator.load_cases(valid_file.path)
    end

    valid_file.rewind
    valid_file.truncate(0)
    valid_file.write(<<~YAML)
      version: 2
      template_only: false
      cases:
        - query: "reaction"
          mode: keyword
          tags: ["work"]
          expected:
            - path: "private/./private-reaction.gif"
    YAML
    valid_file.flush

    template_file = Tempfile.new([ "search-relevance-template", ".yml" ])
    template_file.write(<<~YAML)
      version: 2
      template_only: true
      cases: []
    YAML
    template_file.flush

    cases = SearchRelevanceEvaluator.load_cases(valid_file.path)
    assert_equal "reaction", cases.first.fetch("query")
    evaluator = SearchRelevanceEvaluator.new(cases:, searcher: ->(*) { [] })
    result = evaluator.call
    assert_equal [ "path:private/private-reaction.gif" ], result.case_results.first.fetch("expected")
    assert_raises(SearchRelevanceEvaluator::DatasetError) do
      SearchRelevanceEvaluator.load_cases(template_file.path)
    end
    assert_raises(SearchRelevanceEvaluator::DatasetError) do
      SearchRelevanceEvaluator.load_cases("#{valid_file.path}.missing")
    end
  ensure
    valid_file&.close!
    template_file&.close!
  end

  test "distinguishes duplicate filenames by normalized relative path" do
    cases = [
      {
        "query" => "same name",
        "expected" => [ { "path" => "wanted/duplicate.gif" } ]
      }
    ]
    searcher = ->(*) {
      [
        TestResult.new(id: 10, relative_path: "wrong/duplicate.gif"),
        TestResult.new(id: 11, relative_path: "wanted/./duplicate.gif")
      ]
    }

    result = SearchRelevanceEvaluator.new(cases:, searcher:).call(k: 2)

    assert_equal true, result.case_results.first["hit"]
    assert_equal 0.5, result.case_results.first["reciprocal_rank"]
    assert_equal 1.0, result.case_results.first["recall"]
  end

  test "rejects a result missing both a stable id and relative path" do
    evaluator = SearchRelevanceEvaluator.new(
      cases: [ { "query" => "missing identity", "expected" => [ { "id" => 1 } ] } ],
      searcher: ->(*) { [ TestResult.new(id: nil, relative_path: nil) ] }
    )

    error = assert_raises(SearchRelevanceEvaluator::DatasetError) { evaluator.call }

    assert_match "missing both", error.message
  end
end
