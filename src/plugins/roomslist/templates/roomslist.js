/**
 * @typedef {import('../view').RoomsList} RoomsList
 * @typedef {import('@converse/headless').MUC} MUC
 */
import { html } from "lit";
import { _converse, api, converse, u, constants } from "@converse/headless";
import 'plugins/muc-views/modals/add-muc.js';
import 'plugins/muc-views/modals/muc-list.js';
import { __ } from 'i18n';
import { getUnreadMsgsDisplay } from "shared/chat/utils";

import '../styles/roomsgroups.scss';

const { CLOSED } = constants;
const { isUniView } = u;
const { dayjs } = converse.env;

/** @param {MUC} room */
function isCurrentlyOpen (room) {
    return isUniView() && !room.get('hidden');
}

/** @param {MUC} room */
function tplUnreadIndicator (room) {
    const unread_count = getUnreadMsgsDisplay(room);
    return html`<span
        class="list-item-badge badge badge--muc msgs-indicator unread-dot"
        title="${getUnreadMessagesTitle(unread_count)}"
        aria-label="${getUnreadMessagesTitle(unread_count)}"
    ></span>`;
}

function tplActivityIndicator () {
    return html`<span
        class="list-item-badge badge badge--muc msgs-indicator unread-dot"
        title="${__('New activity')}"
        aria-label="${__('New activity')}"
    ></span>`;
}

/**
 * @param {MUC} room
 */
function getLastMessage(room) {
    return room.getMostRecentMessage?.();
}

/**
 * @param {string} text
 */
function isLikelyURL(text) {
    return /^https?:\/\//i.test(text);
}

/**
 * @param {MUC} room
 */
function getLastMessagePreview(room) {
    const message = getLastMessage(room);
    const text = message?.getMessageText?.();
    if (typeof text !== 'string') {
        return '';
    }
    const normalized_text = text.replace(/\s+/g, ' ').trim();
    if (!normalized_text) {
        return '';
    }
    const is_attachment =
        Boolean(message.get('file')) ||
        Boolean(message.get('oob_url')) ||
        message.get('upload') === 'success' ||
        (isLikelyURL(normalized_text) && normalized_text.includes('/upload/'));

    const preview_text = is_attachment ? `<${__('Attachment')}>` : normalized_text;
    return message.get('sender') === 'me' ? `${__('You')}: ${preview_text}` : preview_text;
}

/**
 * @param {MUC} room
 */
function getLastMessageTimestamp(room) {
    const message = getLastMessage(room);
    const timestamp = message?.get('time');
    if (!timestamp) {
        return '';
    }
    const date = dayjs(timestamp);
    if (!date.isValid()) {
        return '';
    }

    const now = dayjs();
    if (date.isSame(now, 'day')) {
        return date.format(api.settings.get('time_format'));
    }
    if (date.isSame(now.subtract(1, 'day'), 'day')) {
        return __('Yesterday');
    }
    return date.format('M/D/YYYY');
}

/**
 * @param {string|number} num_unread
 */
function getUnreadMessagesTitle(num_unread) {
    return `${num_unread} ${Number(num_unread) === 1 ? __('unread message') : __('unread messages')}`;
}

/**
 * @param {RoomsList} el
 * @param {MUC} room
 */
function tplRoomItem (el, room) {
    const i18n_leave_room = __('Leave this groupchat');
    const has_unread_msgs = room.get('num_unread_general') || room.get('has_activity');
    const last_message = getLastMessagePreview(room);
    const last_message_timestamp = getLastMessageTimestamp(room);
    return html`
        <li class="list-item controlbox-padded available-chatroom d-flex flex-row ${ isCurrentlyOpen(room) ? 'open' : '' } ${ has_unread_msgs ? 'unread-msgs' : '' }"
            data-room-jid="${room.get('jid')}">

            <a class="list-item-link open-room available-room w-100"
                data-room-jid="${room.get('jid')}"
                data-room-name="${room.getDisplayName()}"
                title="${__('Click to open this groupchat')}"
                @click=${ev => el.openRoom(ev)}>
                <span class="room-row">
                    <span class="room-avatar-wrapper">
                        <converse-avatar
                            .model=${room}
                            class="avatar avatar-muc"
                            name="${room.getDisplayName()}"
                            nonce=${room.vcard?.get('vcard_updated')}
                            height="30" width="30"></converse-avatar>
                    </span>
                    <span class="room-main ${has_unread_msgs ? 'unread-msgs' : ''}">
                        <span class="room-main__top">
                            <span class="room-name">${room.getDisplayName()}</span>
                            <span class="room-main__meta">
                                ${ room.get('num_unread') ?
                                    tplUnreadIndicator(room) :
                                    (room.get('has_activity') ? tplActivityIndicator() : '') }
                                ${last_message_timestamp
                                    ? html`<span class="room-last-message-time">${last_message_timestamp}</span>`
                                    : ''}
                            </span>
                        </span>
                        ${last_message ? html`<span class="room-last-message">${last_message}</span>` : ''}
                    </span>
                </span>
            </a>

            <a class="list-item-action close-room"
                tabindex="0"
                data-room-jid="${room.get('jid')}"
                data-room-name="${room.getDisplayName()}"
                title="${i18n_leave_room}"
                @click=${(ev) => el.closeRoom(ev)}>
                <converse-icon
                    class="fa fa-sign-out-alt"
                    size="1.2em"
                    color="${ isCurrentlyOpen(room) ? 'var(--foreground-color)' : '' }"></converse-icon>
            </a>
        </li>`;
}

/**
 * @param {RoomsList} el
 * @param {string} domain
 * @param {MUC[]} rooms
 */
function tplRoomDomainGroup (el, domain, rooms) {
    const i18n_title = __('Click to hide these rooms');
    const collapsed = el.model.get('collapsed_domains');
    const is_collapsed = collapsed.includes(domain);
    return html`
    <div class="muc-domain-group" data-domain="${domain}">
        <a href="#"
           class="list-toggle muc-domain-group-toggle controlbox-padded"
           title="${i18n_title}"
           @click=${ev => el.toggleDomainList(ev, domain)}>

            <converse-icon
                class="fa ${ is_collapsed ? 'fa-caret-right' : 'fa-caret-down' }"
                size="1em"
                color="var(--muc-color)"></converse-icon>
            ${domain}
        </a>
        <ul class="items-list muc-domain-group-rooms ${ is_collapsed ? 'collapsed' : '' }" data-domain="${domain}">
            ${ rooms.map(room => tplRoomItem(el, room)) }
        </ul>
    </div>`;
}

/**
 * @param {RoomsList} el
 * @param {MUC[]} rooms
 */
function tplRoomDomainGroupList (el, rooms) {
    // The rooms should stay sorted as they are iterated and added in order
    const grouped_rooms = new Map();
    for (const room of rooms) {
        const roomdomain = room.get('jid').split('@').at(-1).toLowerCase();
        if (grouped_rooms.has(roomdomain)) {
            grouped_rooms.get(roomdomain).push(room);
        } else {
            grouped_rooms.set(roomdomain, [room]);
        }
    }
    const sorted_domains = Array.from(grouped_rooms.keys());
    sorted_domains.sort();

    return sorted_domains.map(domain => tplRoomDomainGroup(el, domain, grouped_rooms.get(domain)))
}

/**
 * @param {RoomsList} el
 */
export default (el) => {
    const group_by_domain = api.settings.get('muc_grouped_by_domain');
    const rooms = el.getRoomsToShow();
    const i18n_desc_rooms = __('Click to toggle the list of open group chats');
    const i18n_heading_chatrooms = __('Group chats');
    const i18n_title_list_rooms = __('View group chats');
    const title_manage_rooms = 'Manage group chats';
    const i18n_title_new_room = __('Add group chat');
    const i18n_show_bookmarks = __('Bookmarks');
    const is_closed = el.model.get('toggle_state') === CLOSED;

    const btns = [
        html`<a class="dropdown-item show-add-muc-modal" role="button"
                @click="${(ev) => api.modal.show('converse-add-muc-modal', { 'model': el.model }, ev)}"
                data-toggle="modal"
                data-target="#add-chatrooms-modal">
                    <converse-icon class="fa fa-plus" size="1em"></converse-icon>
                    ${i18n_title_new_room}
        </a>`,
        window.manageGroupChats ? html`<a class="dropdown-item" role="button"
                @click="${() => window.manageGroupChats()}"
             >
                 <converse-icon class="fa fa-cog" size="1em"></converse-icon>
                 ${title_manage_rooms}
        </a>` : null,
        html`<a class="dropdown-item show-list-muc-modal" role="button"
                @click="${(ev) => api.modal.show('converse-muc-list-modal', { 'model': el.model }, ev)}"
                data-toggle="modal"
                data-target="#muc-list-modal">
                    <converse-icon class="fa fa-list-ul" size="1em"></converse-icon>
                    ${i18n_title_list_rooms}
        </a>`,
        html`<a class="dropdown-item show-bookmark-list-modal" role="button"
                @click="${(ev) => api.modal.show('converse-bookmark-list-modal', { 'model': el.model }, ev)}"
                data-toggle="modal">
                    <converse-icon class="fa fa-bookmark" size="1em"></converse-icon>
                    ${i18n_show_bookmarks}
        </a>`,
    ].filter(Boolean);

    return html`
        <div class="d-flex controlbox-padded">
            <span class="w-100 controlbox-heading controlbox-heading--groupchats">
                <a class="list-toggle open-rooms-toggle" role="heading" aria-level="3"
                   title="${i18n_desc_rooms}"
                   @click=${ev => el.toggleRoomsList(ev)}>

                    ${i18n_heading_chatrooms}

                    ${rooms.length ? html`<converse-icon
                        class="fa ${ is_closed ? 'fa-caret-right' : 'fa-caret-down' }"
                        size="1em"
                        color="var(--muc-color)"></converse-icon>` : '' }
                </a>
            </span>
            <converse-dropdown class="btn-group dropstart" .items=${btns}></converse-dropdown>
        </div>

        <div class="list-container list-container--openrooms ${ rooms.length ? '' : 'hidden' }">
            <ul class="items-list rooms-list open-rooms-list ${ is_closed ? 'collapsed' : '' }">
                ${ group_by_domain ?
                    tplRoomDomainGroupList(el, rooms) :
                    rooms.map(/** @param {MUC} room */(room) => tplRoomItem(el, room))
                }
            </ul>
        </div>`;
}
