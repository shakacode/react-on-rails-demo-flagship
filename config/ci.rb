# Run using bin/ci

hosted_ci = %w[1 true].include?(ENV.fetch("CI", "").strip.downcase)
playwright_install = hosted_ci ? "npx playwright install --with-deps chromium" : "npx playwright install chromium"

CI.run do
  step "Setup", "bin/setup --skip-server"

  step "Security: Gem audit", "bin/bundler-audit"
  step "Tests: Rails", "bin/rails test"
  step "Tests: Seeds", "env RAILS_ENV=test bin/rails db:seed:replant"
  step "Tests: TypeScript", "npm run typecheck"
  step "Setup: Browser", playwright_install
  step "Tests: Browser", "npm run test:browser"

  # Optional: Run system tests
  # step "Tests: System", "bin/rails test:system"

  # Optional: set a green GitHub commit status to unblock PR merge.
  # Requires the `gh` CLI and `gh extension install basecamp/gh-signoff`.
  # if success?
  #   step "Signoff: All systems go. Ready for merge and deploy.", "gh signoff"
  # else
  #   failure "Signoff: CI failed. Do not merge or deploy.", "Fix the issues and try again."
  # end
end
