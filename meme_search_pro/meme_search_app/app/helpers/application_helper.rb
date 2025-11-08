module ApplicationHelper
  include Pagy::Frontend

  def tailwind_classes_for(flash_type)
    {
      notice: "bg-green-400 border-l-4 border-green-700 text-white",
      error:   "bg-red-400 border-l-4 border-red-700 text-black"
    }.stringify_keys[flash_type.to_s] || flash_type.to_s
  end

  # Determines active tab class for settings sub-navigation
  def settings_active_tab_class(tab)
    current_controller = controller_name.to_sym

    # Map tab names to controller names
    tab_mapping = {
      tags: :tag_names,
      paths: :image_paths,
      models: :image_to_texts
    }

    if tab_mapping[tab] == current_controller
      "text-white bg-fuchsia-500"
    else
      "text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-slate-700/50 hover:bg-white/70 dark:hover:bg-slate-700/70"
    end
  end

  # Button helper methods (mockup-inspired styling)
  def primary_button_classes
    "px-6 py-3 text-white font-semibold bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
  end

  def secondary_button_classes
    "px-6 py-3 text-gray-700 dark:text-gray-300 font-semibold bg-white/90 dark:bg-slate-700/90 backdrop-blur-lg border border-gray-300 dark:border-gray-600 rounded-2xl shadow-lg hover:shadow-xl transition-all"
  end

  def back_button_classes
    "px-6 py-3 text-black font-semibold bg-amber-500 hover:bg-amber-600 rounded-2xl shadow-lg hover:shadow-xl transition-all"
  end

  def edit_button_classes
    "px-6 py-3 text-black font-semibold bg-fuchsia-500 hover:bg-fuchsia-600 rounded-2xl shadow-lg hover:shadow-xl transition-all"
  end

  def show_button_classes
    "px-6 py-3 text-black font-semibold bg-fuchsia-500 hover:bg-fuchsia-600 rounded-2xl shadow-lg hover:shadow-xl transition-all"
  end

  def delete_button_classes
    "px-6 py-3 text-white font-semibold bg-red-500 hover:bg-red-600 rounded-2xl shadow-lg hover:shadow-xl transition-all"
  end

  def new_button_classes
    "px-6 py-3 text-white font-semibold bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
  end

  def submit_button_classes
    "px-8 py-3 text-white font-semibold bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
  end

  def index_button_classes
    "px-6 py-3 text-black font-semibold bg-amber-500 hover:bg-amber-600 rounded-2xl shadow-lg hover:shadow-xl transition-all"
  end

  def rescan_button_classes
    "px-6 py-3 text-black font-semibold bg-white border-2 border-black hover:bg-gray-100 rounded-2xl shadow-lg hover:shadow-xl transition-all"
  end
end
