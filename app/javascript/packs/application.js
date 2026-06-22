// Global entry pack. Component code is NOT imported here: React on Rails
// auto-registration (config.auto_load_bundle) builds a per-component pack
// for app/javascript/src/TasksApp/ror_components/TasksApp and Rails appends
// it to the page automatically when `react_component("TasksApp")` renders.
//
// This pack only carries the global page styles.
import '../styles/site.css';
import 'react-on-rails-rsc/client';
