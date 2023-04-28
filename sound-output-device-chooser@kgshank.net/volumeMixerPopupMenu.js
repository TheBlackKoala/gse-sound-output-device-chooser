//* Original Author: Brendan Early - https://github.com/mymindstorm/gnome-volume-mixer

const { Settings, SettingsSchemaSource } = imports.gi.Gio;
const { MixerSinkInput } = imports.gi.Gvc;

// https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/ui/popupMenu.js
const PopupMenu = imports.ui.popupMenu;
// https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/ui/status/volume.js
const Volume = imports.ui.status.volume;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

var VolumeMixerPopupMenuInstance = class VolumeMixerPopupMenuInstance extends PopupMenu.PopupMenuSection {
    constructor() {
        super();
        this._applicationStreams = {};

        // The PopupSeparatorMenuItem needs something above and below it or it won't display
        this._hiddenItem = new PopupMenu.PopupBaseMenuItem();
        this._hiddenItem.set_height(0);
        this.addMenuItem(this._hiddenItem);

        this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this._control = Volume.getMixerControl();
        this._streamAddedEventId = this._control.connect("stream-added", this._streamAdded.bind(this));
        this._streamRemovedEventId = this._control.connect("stream-removed", this._streamRemoved.bind(this));
        this._updateStreams();
    }

    _streamAdded(control, id) {
        if (id in this._applicationStreams) {
            return;
        }
        const stream = control.lookup_stream_id(id);

        if (stream.is_event_stream || !(stream instanceof MixerSinkInput)) {
            return;
        }
        this._applicationStreams[id] = new ApplicationStreamSlider(stream);
        this.addMenuItem(this._applicationStreams[id].item);
    }

    _streamRemoved(_control, id) {
        if (id in this._applicationStreams) {
            this._applicationStreams[id].item.destroy();
            delete this._applicationStreams[id];
        }
    }

    _updateStreams() {
        for (const id in this._applicationStreams) {
            this._applicationStreams[id].item.destroy();
            delete this._applicationStreams[id];
        }

        for (const stream of this._control.get_streams()) {
            this._streamAdded(this._control, stream.get_id());
        }
    }

    destroy() {
        this._control.disconnect(this._streamAddedEventId);
        this._control.disconnect(this._streamRemovedEventId);
        super.destroy();
    }
}

const { BoxLayout, Label } = imports.gi.St;
const Volume$1 = imports.ui.status.volume;
class ApplicationStreamSlider extends Volume$1.StreamSlider {
    constructor(stream) {
        super(Volume$1.getMixerControl());

        this.stream = stream;
        this._icon.icon_name = stream.get_icon_name();

        let name = stream.get_name();
        let description = stream.get_description();
        if (name || description) {
            this._vbox = new BoxLayout();
            this._vbox.vertical = true;

            this._label = new Label();
            this._label.text = name && `${name} - ${description}`;
            this._vbox.add(this._label);

            this.item.remove_child(this._slider);
            this._vbox.add(this._slider);
            this._slider.set_height(32);

            this.item.actor.add(this._vbox);
        }

    }
}