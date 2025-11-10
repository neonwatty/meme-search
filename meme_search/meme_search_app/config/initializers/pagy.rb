# config/initializers/pagy.rb

# Configure default Pagy settings
Pagy::DEFAULT[:limit] = 10 # items per page
Pagy::DEFAULT[:size]  = 9  # nav bar links

# Require Pagy extras
require "pagy/extras/overflow"
# require 'pagy/extras/navs'

# Set default overflow behavior
Pagy::DEFAULT[:overflow] = :last_page

Pagy::CSS = Pagy.root.join("stylesheets", "pagy.tailwind.css")
