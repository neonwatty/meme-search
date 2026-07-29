require "json"
namespace :search do
  desc "Evaluate search relevance from a v2 YAML dataset with expected IDs or paths (DATASET=... K=10)"
  task relevance: :environment do
    dataset_path = ENV.fetch("DATASET", Rails.root.join("benchmark", "search_relevance.yml")).to_s
    k = Integer(ENV.fetch("K", ImageSearchQuery::DEFAULT_RESULT_LIMIT).to_s, 10)
    cases = SearchRelevanceEvaluator.load_cases(dataset_path)

    evaluator = SearchRelevanceEvaluator.new(
      cases: cases,
      searcher: lambda do |test_case, limit|
        ImageSearchQuery.new(
          query: test_case.fetch("query"),
          mode: test_case.fetch("mode", "keyword"),
          selected_tag_names: test_case.fetch("tags", []),
          limit: limit
        ).call
      end
    )

    result = evaluator.call(k: k)
    puts JSON.pretty_generate(
      metrics: result.metrics,
      cases: result.case_results
    )
  rescue ArgumentError, SearchRelevanceEvaluator::DatasetError => e
    abort "Search relevance evaluation failed: #{e.message}"
  end
end
