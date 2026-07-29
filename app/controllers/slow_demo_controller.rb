# frozen_string_literal: true

# Demonstrates the RSC streaming behavior for a Suspense boundary that
# resolves AFTER the first HTML flush: the header streams immediately while
# the stats section waits on a deliberately slow "query".
#
# This page is also the standing regression bed for late-boundary CSS
# delivery (FOUC): the slow section renders a client component whose CSS is
# an extracted client-chunk stylesheet, so its styles are only known to the
# stream after the delayed props resolve.
# See https://github.com/shakacode/react_on_rails/issues/4560
class SlowDemoController < ApplicationController
  include ReactOnRails::Controller
  include ReactOnRailsPro::Stream

  MAX_DELAY_MS = 10_000
  DEFAULT_DELAY_MS = 1_500

  def index
    @delay_ms = params.fetch(:delay_ms, DEFAULT_DELAY_MS).to_i.clamp(0, MAX_DELAY_MS)

    stream_view_containing_react_components(template: "slow_demo/index")
  end
end
