require "test_helper"

class SlowDemoControllerTest < ActionController::TestCase
  tests SlowDemoController

  test "hosted environments reject the slow demo before streaming" do
    original_env = Rails.env
    @controller.define_singleton_method(:stream_view_containing_react_components) { |**| raise "production must not start streaming" }
    %w[production staging review].each do |environment|
      Rails.env = environment
      get :index, params: { delay_ms: "10000" }
      assert_response :not_found
    end
  ensure
    Rails.env = original_env
  end

  test "structured delay parameters do not crash the local demo" do
    [ ["1"], { value: "1" } ].each do |delay|
      @controller.define_singleton_method(:stream_view_containing_react_components) { |**| head :no_content }
      get :index, params: { delay_ms: delay }
      assert_response :no_content
    end
  end
end
