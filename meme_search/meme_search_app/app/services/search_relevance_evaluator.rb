# frozen_string_literal: true

require "yaml"
require "pathname"

class SearchRelevanceEvaluator
  Result = Data.define(:case_results, :metrics)
  DatasetError = Class.new(ArgumentError)
  MODES = %w[keyword vector].freeze

  def self.load_cases(path)
    document = YAML.safe_load_file(path)
    raise DatasetError, "dataset root must be a mapping" unless document.is_a?(Hash)
    unless document["version"] == 2
      raise DatasetError,
        "dataset version must be 2; filename-only v1 fixtures are ambiguous and must be migrated"
    end
    if document["template_only"] == true
      raise DatasetError,
        "dataset is a replace-me template; copy it, set template_only to false, and add private expected IDs or paths"
    end

    validate_cases!(document["cases"])
    document["cases"]
  rescue Errno::ENOENT
    raise DatasetError, "dataset file was not found: #{path}"
  rescue Psych::SyntaxError => e
    raise DatasetError, "dataset YAML is invalid at line #{e.line}: #{e.problem}"
  end

  def self.validate_cases!(cases)
    raise DatasetError, "cases must be an array" unless cases.is_a?(Array)

    cases.map.with_index do |test_case, index|
      label = "case #{index + 1}"
      raise DatasetError, "#{label} must be a mapping" unless test_case.is_a?(Hash)

      query = test_case["query"]
      unless query.is_a?(String) && query.present? && query.length <= 200
        raise DatasetError, "#{label} query must be a non-empty string of at most 200 characters"
      end

      mode = test_case.fetch("mode", "keyword")
      raise DatasetError, "#{label} mode must be keyword or vector" unless MODES.include?(mode)

      expected = test_case["expected"]
      unless expected.is_a?(Array) && expected.any? &&
          expected.all? { |identifier| identifier.is_a?(Hash) }
        raise DatasetError, "#{label} expected must contain one or more {id: ...} or {path: ...} mappings"
      end
      normalized_expected = expected.map { |identifier| normalize_expected_identifier(identifier, label) }

      tags = test_case.fetch("tags", [])
      unless tags.is_a?(Array) && tags.length <= 10 &&
          tags.all? { |tag| tag.is_a?(String) && tag.present? && tag.length <= 20 }
        raise DatasetError, "#{label} tags must contain at most 10 non-empty names of at most 20 characters"
      end
      test_case.merge("expected" => normalized_expected)
    end
  end

  def self.normalize_expected_identifier(identifier, label)
    unless identifier.keys.length == 1
      raise DatasetError, "#{label} expected identifiers must contain exactly one id or path"
    end

    if identifier.key?("id")
      id = identifier["id"]
      unless id.is_a?(Integer) && id.positive?
        raise DatasetError, "#{label} expected id must be a positive integer"
      end
      return "id:#{id}"
    end

    unless identifier.key?("path")
      raise DatasetError, "#{label} expected identifiers must contain id or path"
    end

    "path:#{normalize_relative_path(identifier['path'], label:)}"
  end

  def self.normalize_relative_path(value, label: "result")
    unless value.is_a?(String) && value.present?
      raise DatasetError, "#{label} expected path must be a non-empty relative path"
    end

    portable_value = value.tr("\\", "/")
    path = Pathname.new(portable_value)
    normalized = path.cleanpath.to_s.tr("\\", "/")
    segments = Pathname.new(normalized).each_filename.to_a
    if path.absolute? || segments.length < 2 || segments.any? { |segment| segment == ".." }
      raise DatasetError, "#{label} expected path must include a library directory and filename"
    end

    normalized
  end

  def initialize(cases:, searcher:)
    @cases = self.class.validate_cases!(cases)
    @searcher = searcher
  end

  def call(k: ImageSearchQuery::DEFAULT_RESULT_LIMIT)
    unless k.is_a?(Integer) && k.between?(1, ImageSearchQuery::MAX_RESULT_LIMIT)
      raise ArgumentError, "k must be an integer between 1 and #{ImageSearchQuery::MAX_RESULT_LIMIT}"
    end

    case_results = cases.map { |test_case| evaluate_case(test_case, k:) }
    Result.new(
      case_results: case_results,
      metrics: aggregate(case_results, k:)
    )
  end

  private

    attr_reader :cases, :searcher

    def evaluate_case(test_case, k:)
      expected = Array(test_case.fetch("expected")).map(&:to_s).uniq
      ranked_results = Array(searcher.call(test_case, k)).first(k).map { |result| result_identifiers(result) }
      returned = ranked_results.map { |result| result.fetch(:display) }
      relevant_ranks = ranked_results.each_index
        .select { |index| (expected & ranked_results[index].fetch(:identifiers)).any? }
        .map { |index| index + 1 }
      matched_expected = expected.select do |identifier|
        ranked_results.any? { |result| result.fetch(:identifiers).include?(identifier) }
      end

      {
        "query" => test_case.fetch("query"),
        "k" => k,
        "expected" => expected,
        "returned" => returned,
        "hit" => relevant_ranks.any?,
        "reciprocal_rank" => relevant_ranks.any? ? 1.0 / relevant_ranks.first : 0.0,
        "recall" => expected.empty? ? 0.0 : matched_expected.length.fdiv(expected.length)
      }
    end

    def result_identifiers(result)
      identifiers = []
      id = result.id if result.respond_to?(:id)
      identifiers << "id:#{id}" if id.is_a?(Integer) && id.positive?

      path = result_relative_path(result)
      identifiers << "path:#{path}" if path

      if identifiers.empty?
        raise DatasetError, "search result is missing both a positive id and a normalized relative path"
      end

      {
        identifiers: identifiers,
        display: identifiers.find { |identifier| identifier.start_with?("path:") } || identifiers.first
      }
    end

    def result_relative_path(result)
      raw_path = if result.respond_to?(:relative_path)
        result.relative_path
      elsif result.respond_to?(:image_path) && result.respond_to?(:name) && result.image_path
        File.join(result.image_path.name.to_s, result.name.to_s)
      end
      return if raw_path.blank?

      self.class.normalize_relative_path(raw_path)
    rescue DatasetError
      nil
    end

    def aggregate(case_results, k:)
      count = case_results.length
      if count.zero?
        return {
          "k" => k,
          "case_count" => 0,
          "hit_rate" => 0.0,
          "mrr" => 0.0,
          "mean_recall" => 0.0
        }
      end

      {
        "k" => k,
        "case_count" => count,
        "hit_rate" => case_results.count { |result| result["hit"] }.fdiv(count),
        "mrr" => case_results.sum { |result| result["reciprocal_rank"] }.fdiv(count),
        "mean_recall" => case_results.sum { |result| result["recall"] }.fdiv(count)
      }
    end
end
