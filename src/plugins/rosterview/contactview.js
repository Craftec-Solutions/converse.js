import { _converse, api } from '@converse/headless';
import { ObservableElement } from 'shared/components/observable.js';
import tplRequestingContact from './templates/requesting_contact.js';
import tplRosterItem from './templates/roster_item.js';
import tplUnsavedContact from './templates/unsaved_contact.js';
import { blockContact, declineContactRequest, removeContact } from './utils.js';

export default class RosterContactView extends ObservableElement {
    /**
     * @typedef {import('shared/components/types').ObservableProperty} ObservableProperty
     */

    constructor() {
        super();
        this.model = null;
        this.chatbox = null;
        this.observable = /** @type {ObservableProperty} */ ('once');
    }

    static get properties() {
        return {
            ...super.properties,
            model: { type: Object },
        };
    }

    initialize() {
        this.listenTo(this.model, 'change', () => this.requestUpdate());
        this.listenTo(this.model, 'highlight', () => this.requestUpdate());
        this.listenTo(this.model, 'vcard:add', () => this.requestUpdate());
        this.listenTo(this.model, 'vcard:change', () => this.requestUpdate());
        this.listenTo(this.model, 'presence:change', () => this.requestUpdate());

        this.onConverseMessage = (data) => {
            const jid = this.model?.get?.('jid');
            if (!jid) {
                return;
            }
            if (data?.attrs?.contact_jid === jid || data?.chatbox?.get?.('jid') === jid) {
                this.requestUpdate();
            }
        };
        this.onAfterMessagesFetched = (chatbox) => {
            if (chatbox?.get?.('jid') === this.model?.get?.('jid')) {
                this.requestUpdate();
            }
        };
        api.listen.on('message', this.onConverseMessage);
        api.listen.on('afterMessagesFetched', this.onAfterMessagesFetched);

        const { chatboxes } = _converse.state;
        if (chatboxes) {
            this.listenTo(chatboxes, 'add', (chatbox) => this.onChatBoxAdded(chatbox));
            this.listenTo(chatboxes, 'remove', (chatbox) => this.onChatBoxRemoved(chatbox));
            this.listenTo(chatboxes, 'destroy', (chatbox) => this.onChatBoxRemoved(chatbox));
            this.bindChatBoxListeners();
        }
    }

    disconnectedCallback() {
        api.listen.not('message', this.onConverseMessage);
        api.listen.not('afterMessagesFetched', this.onAfterMessagesFetched);
        super.disconnectedCallback();
    }

    getChatBox() {
        return _converse.state.chatboxes?.get(this.model.get('jid'));
    }

    bindChatBoxListeners(chatbox = this.getChatBox()) {
        if (!chatbox || this.chatbox === chatbox) {
            return;
        }
        this.unbindChatBoxListeners();
        this.chatbox = chatbox;
        this.listenTo(this.chatbox, 'change', () => this.requestUpdate());
        this.listenTo(this.chatbox.messages, 'add change destroy reset remove', () => this.requestUpdate());
    }

    unbindChatBoxListeners() {
        if (!this.chatbox) {
            return;
        }
        this.stopListening(this.chatbox);
        this.stopListening(this.chatbox.messages);
        this.chatbox = null;
    }

    /**
     * @param {object} chatbox
     */
    onChatBoxAdded(chatbox) {
        if (chatbox.get('jid') !== this.model.get('jid')) {
            return;
        }
        this.bindChatBoxListeners(chatbox);
        this.requestUpdate();
    }

    /**
     * @param {object} chatbox
     */
    onChatBoxRemoved(chatbox) {
        if (this.chatbox !== chatbox) {
            return;
        }
        this.unbindChatBoxListeners();
        this.requestUpdate();
    }

    render() {
        if (this.model instanceof _converse.exports.RosterContact) {
            if (this.model.get('requesting') === true) {
                return tplRequestingContact(this);
            } else if (!this.model.get('subscription')) {
                return tplUnsavedContact(this);
            }
        }
        return tplRosterItem(this);
    }

    /**
     * @param {MouseEvent} ev
     */
    openChat(ev) {
        ev?.preventDefault?.();
        api.chats.open(this.model.get('jid'), {}, true);
    }

    /**
     * @param {MouseEvent} ev
     */
    addContact(ev) {
        ev?.preventDefault?.();
        api.modal.show('converse-add-contact-modal', { contact: this.model }, ev);
    }

    /**
     * @param {MouseEvent} ev
     */
    async removeContact(ev) {
        ev?.preventDefault?.();
        await removeContact(this.model, true);
    }

    /**
     * @param {MouseEvent} ev
     */
    async showUserDetailsModal(ev) {
        ev?.preventDefault?.();
        ev.preventDefault();
        if (this.model instanceof _converse.exports.Profile) {
            api.modal.show('converse-profile-modal', { model: this.model }, ev);
        } else {
            api.modal.show('converse-user-details-modal', { model: this.model }, ev);
        }
    }

    /**
     * @param {MouseEvent} ev
     */
    async blockContact(ev) {
        ev?.preventDefault?.();
        await blockContact(this.model);
    }

    /**
     * @param {MouseEvent} ev
     */
    async acceptRequest(ev) {
        ev?.preventDefault?.();
        api.modal.show('converse-accept-contact-request-modal', { contact: this.model }, ev);
    }

    /**
     * @param {MouseEvent} ev
     */
    async declineRequest(ev) {
        ev?.preventDefault?.();
        declineContactRequest(this.model);
    }
}

api.elements.define('converse-roster-contact', RosterContactView);
