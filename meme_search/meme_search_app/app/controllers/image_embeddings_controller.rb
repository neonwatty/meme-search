class ImageEmbeddingsController < ApplicationController
  before_action :set_image_embedding, only: %i[ show edit update destroy ]

  # GET /image_embeddings or /image_embeddings.json
  def index
    @image_embeddings = ImageEmbedding.all
  end

  # GET /image_embeddings/1 or /image_embeddings/1.json
  def show
  end

  # GET /image_embeddings/new
  def new
    @image_embedding = ImageEmbedding.new
  end

  # GET /image_embeddings/1/edit
  def edit
  end

  # POST /image_embeddings or /image_embeddings.json
  def create
    @image_embedding = ImageEmbedding.new(image_embedding_params)

    respond_to do |format|
      if @image_embedding.save
        format.html { redirect_to @image_embedding, notice: "Image embedding was successfully created." }
        format.json { render :show, status: :created, location: @image_embedding }
      else
        format.html { render :new, status: :unprocessable_entity }
        format.json { render json: @image_embedding.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /image_embeddings/1 or /image_embeddings/1.json
  def update
    respond_to do |format|
      if @image_embedding.update(image_embedding_params)
        format.html { redirect_to @image_embedding, notice: "Image embedding was successfully updated." }
        format.json { render :show, status: :ok, location: @image_embedding }
      else
        format.html { render :edit, status: :unprocessable_entity }
        format.json { render json: @image_embedding.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /image_embeddings/1 or /image_embeddings/1.json
  def destroy
    @image_embedding.destroy!

    respond_to do |format|
      format.html { redirect_to image_embeddings_path, status: :see_other, notice: "Image embedding was successfully destroyed." }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_image_embedding
      @image_embedding = ImageEmbedding.find(params[:id])
    end

    # Only allow a list of trusted parameters through.
    def image_embedding_params
      params.fetch(:image_embedding, {})
    end

    def vector_search(query)
      element = ImageEmbedding.new({ embedding: query })
      element.compute_embedding
      element.get_neighbors
    end
end
