const St = imports.gi.St;
const Lang = imports.lang;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const Gettext = imports.gettext;
const _ = Gettext.gettext;

const Keymap = Gdk.Keymap.get_default();
const Caribou = imports.gi.Caribou;

const Panel = imports.ui.panel;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const MessageTray = imports.ui.messageTray;

const Meta = imports.ui.extensionSystem.extensionMeta["lockkeys@vaina.lt"];

let indicator;

function main() {
	init();
	enable();
}

function init() {
	indicator = new LockKeysIndicator();
}

function enable() {
	//Main.panel.addToStatusArea('numlock', indicator, getPreferredIndex());
	Main.panel._rightBox.insert_actor(indicator.actor,  getPreferredIndex());
	Main.panel._menus.addMenu(indicator.menu);
}

function disable() {
	//indicator.destroy();
	Main.panel._rightBox.remove_actor(indicator.actor);
	Main.panel._menus.removeMenu(indicator.menu);
}

function getPreferredIndex() {
	//just before xkb layout indicator
	if (Main.panel._statusArea['keyboard'] != null) {
		let xkb = Main.panel._statusArea['keyboard'];
		let children = Main.panel._rightBox.get_children();
		
		let i;
		for (i = children.length - 1; i >= 0; i--) {
			//global.log("i:" + i + " role pos " +  children[i]._rolePosition);
			if(xkb == children[i]._delegate){
				//return children[i]._rolePosition;
				return i;
			}
		}
	}
    return 0;
}


function LockKeysIndicator() {
   this._init();
}

LockKeysIndicator.prototype = {
	__proto__: PanelMenu.Button.prototype,

	_init: function() {
		PanelMenu.Button.prototype._init.call(this, St.Align.START);

		// For highlight to work properly you have to used themed
		// icons. Fortunately we can add our directory to the search
		// path.
		Gtk.IconTheme.get_default().append_search_path(Meta.path);

		this.numIcon = new St.Icon({icon_name: "numlock-enabled",
		                            icon_type: St.IconType.SYMBOLIC,
		                            style_class: 'system-status-icon'});
		this.capsIcon = new St.Icon({icon_name: "capslock-enabled",
		                             icon_type: St.IconType.SYMBOLIC,
		                             style_class: 'system-status-icon'});

		this.layoutManager = new St.BoxLayout({vertical: false,
		                                       style_class: 'lockkeys-container'});
		this.layoutManager.add(this.numIcon);
		this.layoutManager.add(this.capsIcon);
		
		this.actor.add_actor(this.layoutManager);
		
		this.numMenuItem = new PopupMenu.PopupSwitchMenuItem(_('Num Lock'), false, { reactive: true });
		this.numMenuItem.connect('activate', Lang.bind(this, this._handleNumlockMenuItem));
		this.menu.addMenuItem(this.numMenuItem);

		this.capsMenuItem = new PopupMenu.PopupSwitchMenuItem(_('Caps Lock'), false, { reactive: true });
		this.capsMenuItem.connect('activate', Lang.bind(this, this._handleCapslockMenuItem));
		this.menu.addMenuItem(this.capsMenuItem);
		
		this._updateState();
		Keymap.connect('state-changed', Lang.bind(this, this._handleStateChange));
	},

	_handleNumlockMenuItem: function(actor, event) {
		keyval = Gdk.keyval_from_name("Num_Lock");
		Caribou.XAdapter.get_default().keyval_press(keyval);
		Caribou.XAdapter.get_default().keyval_release(keyval);
		//global.log("handled by numlock");
	}, 
	
	_handleCapslockMenuItem: function(actor, event) {
		keyval = Gdk.keyval_from_name("Caps_Lock");
		Caribou.XAdapter.get_default().keyval_press(keyval);
		Caribou.XAdapter.get_default().keyval_release(keyval);
		//global.log("handled by capslock");
	}, 
	
	_handleStateChange: function(actor, event) {
		if (this.numlock_state != this._getNumlockState()) {
			let notification_text = _('Num Lock') + ' ' + this._getStateText(this._getNumlockState());
			this._showNotification(notification_text, "numlock-enabled");
		}
		if (this.capslock_state != this._getCapslockState()) {
			let notification_text = _('Caps Lock') + ' ' + this._getStateText(this._getCapslockState());
			this._showNotification(notification_text, "capslock-enabled");
		}
		this._updateState();
	}, 

	_updateState: function() {
		this.numlock_state = this._getNumlockState();
		this.capslock_state = this._getCapslockState();

		if (this.numlock_state)
			this.numIcon.set_icon_name("numlock-enabled");
		else
			this.numIcon.set_icon_name("numlock-disabled");

		if (this.capslock_state)
			this.capsIcon.set_icon_name("capslock-enabled");
		else
			this.capsIcon.set_icon_name("capslock-disabled");

		this.numMenuItem.setToggleState( this.numlock_state );
		this.capsMenuItem.setToggleState( this.capslock_state );
	},
	
	_showNotification: function(notification_text, icon_name) {
		this._prepareSource(icon_name);
		
		let notification = null;
		if (this._source.notifications.length == 0) {
			notification = new MessageTray.Notification(this._source, notification_text);
			notification.setTransient(true);
			notification.setResident(false);
		} else {
			notification = this._source.notifications[0];
            notification.update(notification_text, null, { clear: true });
		}
		
		this._source.notify(notification);
	},
	
	_prepareSource: function(icon_name) {
		if (this._source == null) {
			this._source = new MessageTray.SystemNotificationSource();
			this._source.createNotificationIcon = function() {
				return new St.Icon({ icon_name: icon_name,
									 icon_type: St.IconType.SYMBOLIC,
									 icon_size: this.ICON_SIZE });
			};
			this._source.connect('destroy', Lang.bind(this,
				function() {
					this._source = null;
				}));
			Main.messageTray.add(this._source);
		}
	},
	
	 _getStateText: function(state) {
		return state ? _('On') : _('Off');
	},

	 _getNumlockState: function() {
		return Keymap.get_num_lock_state();
	},
	
	_getCapslockState: function() {
		return Keymap.get_caps_lock_state();
	},
}
