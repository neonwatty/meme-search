module ImageCoresHelper
  def absolute_image_path(image_core)
    image_path = image_core.image_path.name
    image_name = image_core.name
    full_path = "/memes/" + image_path + "/" + image_name
    absolute_path = "#{request.protocol}#{request.host_with_port}#{full_path}"
    return absolute_path, image_name
  end
end
