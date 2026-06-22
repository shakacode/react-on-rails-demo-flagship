# frozen_string_literal: true

ReactOnRailsPro.configure do |config|
  config.enable_rsc_support = true
  config.rsc_bundle_js_file = "rsc-bundle.js"

  config.server_renderer = "NodeRenderer"
  config.renderer_use_fallback_exec_js = false
  config.renderer_url = ENV.fetch("RENDERER_URL", "http://localhost:3800")
  demo_password_allowed =
    ENV["ALLOW_DEMO_RENDERER_PASSWORD"] == "true" &&
    (Rails.env.development? || Rails.env.test?)
  renderer_password = ENV["RENDERER_PASSWORD"].presence

  config.renderer_password = if demo_password_allowed
                               renderer_password || "development_password"
                             else
                               renderer_password ||
                                 raise(
                                   KeyError,
                                   "RENDERER_PASSWORD is required unless ALLOW_DEMO_RENDERER_PASSWORD=true in development/test",
                                 )
                             end

  config.rsc_payload_generation_url_path = "rsc_payload/"
end
