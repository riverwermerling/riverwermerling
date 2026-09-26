/*
 * Site settings. Change these before going live.
 *
 * signupEndpoint: where sign-ups and guide feedback are sent (JSON POST).
 *   Leave empty while testing: submissions are then kept in this browser
 *   only (localStorage "steady-signups") and nothing is sent anywhere.
 *   See site/README.md for connecting a real backend.
 *
 * boxPrice: the price shown for the Steady Box. This is a willingness-to-pay
 *   test, so it's worth trying more than one price over time.
 */
window.STEADY_CONFIG = {
  signupEndpoint: '',
  boxPrice: '£79',
};
