(function () {
  'use strict';

  window.settings = {
    // WARP VPN
    setWarpLaunchEnabled: function (enabled) {
      return window.__TAURI__.core.invoke('set_warp_launch_enabled', { enabled: enabled });
    },
    getWarpLaunchEnabled: function () {
      return window.__TAURI__.core.invoke('get_warp_launch_enabled');
    },
    getWarpEnabled: function () {
      return window.__TAURI__.core.invoke('get_warp_enabled');
    },
    setWarpEnabled: function (enabled) {
      return window.__TAURI__.core.invoke('set_warp_enabled', { enabled: enabled });
    },
    getWarpStatus: function () {
      return window.__TAURI__.core.invoke('get_warp_status');
    },
    // Discord RPC
    getDiscordRPCEnabled: function () {
      return window.__TAURI__.core.invoke('get_discord_rpc_enabled');
    },
    setDiscordRPCEnabled: function (enabled) {
      return window.__TAURI__.core.invoke('set_discord_rpc_enabled', { enabled: enabled });
    },
    // Version and updates
    getVersion: function () {
      return window.__TAURI__.core.invoke('get_app_version');
    },
    checkForUpdates: function () {
      return window.__TAURI__.core.invoke('check_for_updates');
    },
    installUpdate: function () {
      return window.__TAURI__.core.invoke('install_update');
    },
    openReleasesPage: function () {
      return window.__TAURI__.core.invoke('open_releases_page');
    },
    // Stream URL, reset, uninstall
    getStreamUrl: function () {
      return window.__TAURI__.core.invoke('get_stream_url');
    },
    setStreamUrl: function (url) {
      return window.__TAURI__.core.invoke('set_stream_url', { url: url });
    },
    resetApp: function () {
      return window.__TAURI__.core.invoke('reset_app');
    },
    uninstallApp: function () {
      return window.__TAURI__.core.invoke('uninstall_app');
    },
    // Hardware acceleration
    getHardwareAcceleration: function () {
      return window.__TAURI__.core.invoke('get_hardware_acceleration');
    },
    setHardwareAcceleration: function (enabled) {
      return window.__TAURI__.core.invoke('set_hardware_acceleration', { enabled: enabled });
    },
    restartApp: function () {
      return window.__TAURI__.core.invoke('restart_app');
    },
    // Volume boost
    getVolumeBoost: function () {
      return window.__TAURI__.core.invoke('get_volume_boost');
    },
    setVolumeBoost: function (value) {
      return window.__TAURI__.core.invoke('set_volume_boost', { value: value });
    },
  };

  console.log('[P-Stream Settings] Settings bridge initialized');
})();
