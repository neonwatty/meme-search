class ImageTagsController < ApplicationController
  before_action :set_image_tag, only: %i[ show edit update destroy ]

  # GET /image_tags or /image_tags.json
  def index
    @image_tags = ImageTag.all
  end

  # GET /image_tags/1 or /image_tags/1.json
  def show
  end

  # GET /image_tags/new
  def new
    @image_tag = ImageTag.new
  end

  # GET /image_tags/1/edit
  def edit
  end

  # POST /image_tags or /image_tags.json
  def create
    @image_tag = ImageTag.new(image_tag_params)

    respond_to do |format|
      if @image_tag.save
        format.html { redirect_to @image_tag, notice: "Image tag was successfully created." }
        format.json { render :show, status: :created, location: @image_tag }
      else
        format.html { render :new, status: :unprocessable_entity }
        format.json { render json: @image_tag.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /image_tags/1 or /image_tags/1.json
  def update
    respond_to do |format|
      if @image_tag.update(image_tag_params)
        format.html { redirect_to @image_tag, notice: "Image tag was successfully updated." }
        format.json { render :show, status: :ok, location: @image_tag }
      else
        format.html { render :edit, status: :unprocessable_entity }
        format.json { render json: @image_tag.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /image_tags/1 or /image_tags/1.json
  def destroy
    @image_tag.destroy!

    respond_to do |format|
      format.html { redirect_to image_tags_path, status: :see_other, notice: "Image tag was successfully destroyed." }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_image_tag
      @image_tag = ImageTag.find(params[:id])
    end

    # Only allow a list of trusted parameters through.
    def image_tag_params
      params.fetch(:image_tag, {})
    end
end
