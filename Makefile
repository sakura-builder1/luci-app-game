#
# Copyright (C) 2026 sakura-builder1
#
include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI Retro Game Station (怀旧游戏)
LUCI_DESCRIPTION:=Turn your router into a retro game station: manage ROMs in LuCI and play them in any browser (NES/SNES/GB/GBA/MD/PS1/Arcade...). Supports covers, cheats, keyboard & gamepad mapping, and router-side save states.
LUCI_DEPENDS:=+luci-base +rpcd +uhttpd +libubox +jsonfilter +unzip
PKG_VERSION:=1.0.20
PKG_RELEASE:=1

define Package/luci-app-game/conffiles
/etc/config/game
endef

include $(TOPDIR)/feeds/luci/luci.mk


# call BuildPackage - OpenWrt buildroot signature
