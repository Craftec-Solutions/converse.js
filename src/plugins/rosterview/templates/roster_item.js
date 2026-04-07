import { __ } from 'i18n';
import { _converse, api, converse } from '@converse/headless';
import { html } from 'lit';
import { getUnreadMsgsDisplay } from 'shared/chat/utils.js';
import { STATUSES } from '../constants.js';

const { dayjs } = converse.env;

/**
 * @param {import('../contactview').default} el
 */
export function tplRemoveButton(el) {
    const display_name = el.model.getDisplayName();
    const i18n_remove = __('Click to remove %1$s as a contact', display_name);
    return html`<a
        class="dropdown-item remove-xmpp-contact"
        role="button"
        @click="${(ev) => el.removeContact(ev)}"
        title="${i18n_remove}"
        data-toggle="modal"
    >
        <converse-icon class="fa fa-trash-alt" size="1em"></converse-icon>
        ${__('Remove')}
    </a>`;
}

/**
 * @param {import('../contactview').default} el
 */
export function tplDetailsButton(el) {
    const display_name = el.model.getDisplayName();
    const i18n_remove = __('Click to show more details about %1$s', display_name);
    return html`<a
        class="dropdown-item"
        role="button"
        @click="${(ev) => el.showUserDetailsModal(ev)}"
        title="${i18n_remove}"
        data-toggle="modal"
    >
        <converse-icon class="fa fa-id-card" size="1em"></converse-icon>
        ${__('Details')}
    </a>`;
}

/**
 * @param {object} contact
 */
function getLastMessage(contact) {
    const chatbox = _converse.state.chatboxes?.get(contact.get('jid'));
    return chatbox?.getMostRecentMessage?.();
}

/**
 * @param {string} text
 */
function isLikelyURL(text) {
    return /^https?:\/\//i.test(text);
}

/**
 * @param {object} contact
 */
function getLastMessagePreview(contact) {
    const message = getLastMessage(contact);
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
 * @param {object} contact
 */
function getLastMessageTimestamp(contact) {
    const message = getLastMessage(contact);
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
 * @param {import('../contactview').default} el
 */
export default (el) => {
    const bare_jid = _converse.session.get('bare_jid');
    const show = el.model.getStatus() || 'offline';
    let classes, color;
    if (show === 'online') {
        [classes, color] = ['fa fa-circle', 'chat-status-online'];
    } else if (show === 'dnd') {
        [classes, color] = ['fa fa-minus-circle', 'chat-status-busy'];
    } else if (show === 'away') {
        [classes, color] = ['fa fa-circle', 'chat-status-away'];
    } else {
        [classes, color] = ['fa fa-circle', 'chat-status-offline'];
    }

    const is_self = bare_jid === el.model.get('jid');
    const desc_status = STATUSES[show];
    const num_unread = getUnreadMsgsDisplay(el.model);
    const display_name = el.model.getDisplayName({ context: 'roster' });
    const jid = el.model.get('jid');
    const last_message = getLastMessagePreview(el.model);
    const last_message_timestamp = getLastMessageTimestamp(el.model);
    const i18n_chat = is_self
        ? __('Click to chat with yourself')
        : `Click to chat with ${display_name}`;

    const btns = [
        tplDetailsButton(el),
        ...(api.settings.get('allow_contact_removal') && !is_self ? [tplRemoveButton(el)] : []),
    ];

    return html`<a
            class="list-item-link cbox-list-item open-chat ${num_unread ? 'unread-msgs' : ''}"
            title="${i18n_chat}"
            href="#"
            data-jid=${jid}
            @click=${el.openChat}
        >
            <span class="contact-row">
                <span class="contact-avatar-wrapper">
                    <converse-avatar
                        .model=${el.model}
                        class="avatar"
                        name="${el.model.getDisplayName()}"
                        nonce=${el.model.vcard?.get('vcard_updated')}
                        height="30"
                        width="30"
                    ></converse-avatar>

                    ${['both', 'to'].includes(el.model.get('subscription'))
                        ? html` <converse-icon
                              title="${desc_status}"
                              color="var(--${color})"
                              size="1em"
                              class="${classes} chat-status chat-status--avatar"
                          ></converse-icon>`
                        : ''}
                </span>
                <span class="contact-main ${num_unread ? 'unread-msgs' : ''}">
                    <span class="contact-main__top">
                        <span class="contact-name contact-name--${show} ${num_unread ? 'unread-msgs' : ''}">
                            ${display_name}
                        </span>
                        <span class="contact-main__meta">
                            ${num_unread
                                ? html`<span
                                      class="msgs-indicator badge unread-dot"
                                      title="${getUnreadMessagesTitle(num_unread)}"
                                      aria-label="${getUnreadMessagesTitle(num_unread)}"
                                  ></span>`
                                : ''}
                            ${last_message_timestamp
                                ? html`<span class="contact-last-message-time">${last_message_timestamp}</span>`
                                : ''}
                        </span>
                    </span>
                    ${last_message ? html`<span class="contact-last-message">${last_message}</span>` : ''}
                </span>
            </span>
        </a>
        <span class="contact-actions">
            <converse-dropdown class="btn-group dropstart list-item-action" .items=${btns}></converse-dropdown>
        </span>`;
};
