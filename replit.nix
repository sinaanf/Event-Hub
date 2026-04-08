{pkgs}: {
  deps = [
    pkgs.mesa
    pkgs.cairo
    pkgs.pango
    pkgs.alsa-lib
    pkgs.cups
    pkgs.at-spi2-atk
    pkgs.libxkbcommon
    pkgs.xorg.libxcb
    pkgs.xorg.libXcursor
    pkgs.xorg.libXrandr
    pkgs.xorg.libXfixes
    pkgs.xorg.libXext
    pkgs.xorg.libXdamage
    pkgs.xorg.libXcomposite
    pkgs.xorg.libX11
    pkgs.expat
    pkgs.dbus
    pkgs.nspr
    pkgs.nss
    pkgs.glib
    pkgs.chromium
  ];
}
