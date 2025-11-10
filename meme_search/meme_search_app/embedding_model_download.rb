require 'bundler/setup'
require 'informers'

model = Informers.pipeline("embedding", "sentence-transformers/all-MiniLM-L6-v2")

def compute(model, snippet)
  embedding = model.call(snippet)
end

puts compute(model, 'hello world!')
