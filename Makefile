#
# Copyright (C) 2026 sakura-builder1
#
include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI Retro Game Station (Retro Gaming)
LUCI_DESCRIPTION:=Turn your router into a retro game station: manage ROMs in LuCI and play them in any browser. Supports covers, cheats, keyboard & gamepad mapping, and router-side save states. (AI-assisted development)
LUCI_DEPENDS:=+luci-base +rpcd +uhttpd +libubox +jsonfilter +unzip
PKG_LICENSE:=GPL-3.0-only
PKG_LICENSE_FILES:=LICENSE
PKG_VERSION:=1.0.20
PKG_RELEASE:=1

define Package/luci-app-game/conffiles
/etc/config/game
endef

include $(TOPDIR)/feeds/luci/luci.mk


# call BuildPackage - OpenWrt buildroot signature
