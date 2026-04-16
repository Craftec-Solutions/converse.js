import { _converse, api, converse, u, constants } from '@converse/headless';
import { __ } from 'i18n';
import 'plugins/muc-views/modals/muc-details.js';
import { CustomElement } from 'shared/components/element.js';
import RoomsListModel from './model.js';
import tplRoomslist from './templates/roomslist.js';

const { Strophe } = converse.env;
const { initStorage } = u;
const { CHATROOMS_TYPE, CLOSED, OPENED } = constants;

export class RoomsList extends CustomElement {
    initialize() {
        this.bound_room_message_listeners = new Set();
        const bare_jid = _converse.session.get('bare_jid');
        const id = `converse.roomspanel${bare_jid}`;
        this.model = new RoomsListModel({ id });
        _converse.state.roomslist = this.model;

        initStorage(this.model, id);
        this.model.fetch();

        const { chatboxes } = _converse.state;
        this.listenTo(chatboxes, 'add', (chatbox) => this.onChatBoxAdded(chatbox));
        this.listenTo(chatboxes, 'remove', (chatbox) => this.onChatBoxRemoved(chatbox));
        this.listenTo(chatboxes, 'destroy', (chatbox) => this.onChatBoxRemoved(chatbox));
        this.listenTo(chatboxes, 'change', this.renderIfRelevantChange);
        this.listenTo(chatboxes, 'vcard:add', () => this.requestUpdate());
        this.listenTo(chatboxes, 'vcard:change', () => this.requestUpdate());
        this.listenTo(this.model, 'change', () => this.requestUpdate());
        chatboxes.each((chatbox) => this.bindRoomMessageListeners(chatbox));

        this.requestUpdate();
    }

    render() {
        return tplRoomslist(this);
    }

    /** @param {import('@converse/headless').Model} model */
    renderIfChatRoom(model) {
        u.muc.isChatRoom(model) && this.requestUpdate();
    }

    /** @param {import('@converse/headless').Model} model */
    renderIfRelevantChange(model) {
        const attrs = ['bookmarked', 'hidden', 'name', 'num_unread', 'num_unread_general', 'has_activity'];
        const changed = model.changed || {};
        if (u.muc.isChatRoom(model) && Object.keys(changed).filter((m) => attrs.includes(m)).length) {
            this.requestUpdate();
        }
    }

    /** @param {import('@converse/headless').Model} chatbox */
    onChatBoxAdded(chatbox) {
        this.bindRoomMessageListeners(chatbox);
        this.renderIfChatRoom(chatbox);
    }

    /** @param {import('@converse/headless').Model} chatbox */
    onChatBoxRemoved(chatbox) {
        this.unbindRoomMessageListeners(chatbox);
        this.renderIfChatRoom(chatbox);
    }

    /** @param {import('@converse/headless').Model} chatbox */
    bindRoomMessageListeners(chatbox) {
        if (!u.muc.isChatRoom(chatbox) || !chatbox.messages) {
            return;
        }
        const jid = chatbox.get('jid');
        if (!jid || this.bound_room_message_listeners.has(jid)) {
            return;
        }
        this.bound_room_message_listeners.add(jid);
        this.listenTo(chatbox.messages, 'add change destroy reset remove', () => this.requestUpdate());
    }

    /** @param {import('@converse/headless').Model} chatbox */
    unbindRoomMessageListeners(chatbox) {
        if (!u.muc.isChatRoom(chatbox) || !chatbox.messages) {
            return;
        }
        this.bound_room_message_listeners.delete(chatbox.get('jid'));
        this.stopListening(chatbox.messages);
    }

    /** @returns {import('@converse/headless').MUC[]} */
    getRoomsToShow() {
      const { chatboxes } = _converse.state;
      const rooms = chatboxes.filter((m) => m.get('type') === CHATROOMS_TYPE && !m.get('closed'));

      rooms.sort((a, b) => {
        const msg_a = a.getMostRecentMessage?.();
        const msg_b = b.getMostRecentMessage?.();
        const has_msg_a = Boolean(msg_a);
        const has_msg_b = Boolean(msg_b);

        // Rooms with at least one message sort before rooms without
        if (has_msg_a !== has_msg_b) {
          return has_msg_a ? -1 : 1;
        }

        // Among rooms with messages, sort by most recent message timestamp descending
        if (has_msg_a && has_msg_b) {
          const time_a = Date.parse(msg_a.get('time')) || 0;
          const time_b = Date.parse(msg_b.get('time')) || 0;
          if (time_a !== time_b) {
            return time_a < time_b ? 1 : -1;
          }
        }

        // Fall back to alphabetical
        const name_a = a.getDisplayName().toLowerCase();
        const name_b = b.getDisplayName().toLowerCase();
        return name_a < name_b ? -1 : name_a > name_b ? 1 : 0;
      });

      return rooms;
    }

    /** @param {Event} ev */
    async openRoom(ev) {
        ev.preventDefault();
        const target = u.ancestor(/** @type {HTMLElement} */ (ev.target), '.open-room');
        const name = target.getAttribute('data-room-name');
        const jid = target.getAttribute('data-room-jid');
        const data = {
            'name': name || Strophe.unescapeNode(Strophe.getNodeFromJid(jid)) || jid,
        };
        await api.rooms.open(jid, data, true);
    }

    /** @param {Event} ev */
    async closeRoom(ev) {
        ev.preventDefault();
        const target = /** @type {HTMLElement} */ (ev.currentTarget);
        const name = target.getAttribute('data-room-name');
        const jid = target.getAttribute('data-room-jid');
        const result = await api.confirm(__('Confirm'), __('Are you sure you want to leave the groupchat %1$s?', name));
        if (result) {
            const room = await api.rooms.get(jid);
            room.close();
        }
    }

    /** @param {Event} [ev] */
    toggleRoomsList(ev) {
        ev?.preventDefault?.();
        const list_el = this.querySelector('.open-rooms-list');
        if (this.model.get('toggle_state') === CLOSED) {
            u.slideOut(list_el).then(() => this.model.save({ 'toggle_state': OPENED }));
        } else {
            u.slideIn(list_el).then(() => this.model.save({ 'toggle_state': CLOSED }));
        }
    }

    /**
     * @param {Event} ev
     * @param {string} domain
     */
    toggleDomainList(ev, domain) {
        ev?.preventDefault?.();
        const collapsed = this.model.get('collapsed_domains');
        if (collapsed.includes(domain)) {
            this.model.save({ 'collapsed_domains': collapsed.filter((d) => d !== domain) });
        } else {
            this.model.save({ 'collapsed_domains': [...collapsed, domain] });
        }
    }
}

api.elements.define('converse-rooms-list', RoomsList);
