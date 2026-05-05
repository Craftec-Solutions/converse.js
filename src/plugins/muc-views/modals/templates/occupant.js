import { __ } from 'i18n';
import { html } from "lit";

export default (el) => {
    const model = el.model;
    const roster_contact = model.getRosterContact?.();
    const has_occupant_avatar = !!(model.vcard?.get('image_type') && model.vcard?.get('image'));
    const avatar_model = has_occupant_avatar ? model : roster_contact || model;
  const hats = el.model?.get('hats')?.length ? el.model.get('hats') : [];
  const muc = el.model.collection.chatroom;

  const i18n_add_to_contacts = __('Add to Contacts');

  const allowed_commands = muc.getAllowedCommands();
  const may_moderate = allowed_commands.includes('modtools');
  const can_see_real_jids = muc.features.get('nonanonymous') || muc.getOwnRole() === 'moderator';

  const bare_jid = _converse.session.get('bare_jid');
  const not_me = jid != bare_jid;

  const add_to_contacts = api.settings.get('singleton')
    ? '' // in singleton mode, there is no roster, so adding to contact makes no sense.
    : api.contacts.get(jid)
      .then((contact) => !contact && not_me && can_see_real_jids)
      .then((add) => add ? html`<li><button class="btn btn-primary" type="button" @click=${() => el.addToContacts()}>${i18n_add_to_contacts}</button></li>` : '');

  return html`
        <div class="row">
            <div class="col-auto">
                <converse-avatar
                    .model=${el.model}
                    class="avatar modal-avatar"
                    name="${el.model.getDisplayName()}"
                    nonce=${vcard?.get('vcard_updated')}
                    height="120" width="120"></converse-avatar>
            </div>
            <div class="col">
                <ul class="occupant-details list-unstyled">
                    <li class="row mb-2">
                        <div class="col text-start"><strong>${__('Nickname')}:</strong></div>
                        <div class="col text-end">${nick}</div>
                    </li>
                    <li class="row mb-2">
                        <div class="col text-start"><strong>${__('XMPP Address')}:</strong></div>
                        <div class="col text-end">
                          ${jid ? html`<a href="#" @click="${el.openChat}">${jid}</a>` : ''}
                        </div>
                    </li>
                    <li class="row mb-2">
                        <div class="col text-start"><strong>${__('Affiliation')}:</strong></div>
                        <div class="col text-end">${affiliation}&nbsp;
                            ${may_moderate ? html`
                                <a href="#"
                                   data-form="affiliation-form"
                                   class="toggle-form"
                                   @click=${(ev) => el.toggleForm(ev)}><converse-icon class="fa fa-wrench" size="1em"></converse-icon>
                                </a>` : ''
  }
                        </div>
                        ${el.show_affiliation_form ?
    html`<div class="row mt-2"><converse-muc-affiliation-form jid=${jid} .muc=${muc} affiliation=${affiliation}></converse-muc-affiliation-form></div>` : ''}
                    </li>
                    <li class="row mb-2">
                        <div class="col text-start"><strong>${__('Role')}:</strong></div>
                        <div class="col text-end">${role}&nbsp;
                            ${may_moderate && role ? html`
                                <a href="#"
                                   data-form="row-form"
                                   class="toggle-form"
                                   @click=${(ev) => el.toggleForm(ev)}><converse-icon class="fa fa-wrench" size="1em"></converse-icon>
                                </a>` : ''
  }
                        </div>
                        ${el.show_role_form ? html`<div class="row mt-2"><converse-muc-role-form jid=${jid} .muc=${muc} role=${role}></converse-muc-role-form></div>` : ''}
                    </li>
                    <li class="row mb-2">
                        <div class="col text-start"><strong>${__('Hats')}:</strong></div>
                        <div class="col text-end">${hats.map((hat) => hat.title).join(', ')}</div>
    const i18n_name = __('Name');
    	<div style="display: flex; align-items: center; gap: 1rem;">
    		<converse-avatar
    			.model=${avatar_model}
    			class="avatar"
    			name="${model.getDisplayName()}"
    			nonce=${avatar_model.vcard?.get('vcard_updated')}
    			height="72" width="72"
    		></converse-avatar>

    		<div>
    			<p><strong>${i18n_name}:</strong> ${model.getDisplayName()}</p>
    		</div>
    	</div>
    `;
}
