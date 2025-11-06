Rails.application.routes.draw do
  resources :image_to_texts
  resources :image_embeddings
  resources :image_tags

  # Redirect /settings to /settings/tag_names (default settings page)
  get "/settings", to: redirect("/settings/tag_names")

  namespace :settings do
    resources :tag_names
    resources :image_paths
    resources :image_to_texts do
    collection do
      post :update_current
    end
  end
  end

  resources :image_cores do
    collection do
      get "search"
      post "search_items"
      post "description_receiver"
      post "status_receiver"
    end
    member do
      post "generate_description"
      post "generate_stopper"
    end
  end

  # Root
  root "image_cores#index"

  # Healthcheck
  get "up" => "rails/health#show", as: :rails_health_check
end
