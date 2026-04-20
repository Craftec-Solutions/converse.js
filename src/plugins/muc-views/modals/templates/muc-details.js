import { __ } from 'i18n';
import { html } from "lit";

export default (model) => {
    const num_occupants = (() => {
      const seen = new Set();
      return model.occupants.filter((o) => {
        if (o.get('show') === 'offline') return false;
        const jid = o.get('jid');
        if (!jid) return false;
        const bareJid = jid.split('/')[0];
        if (seen.has(bareJid)) return false;
        seen.add(bareJid);
        return true;
      }).length;
    })();

    const i18n_name = __('Name');
    const i18n_online_users = __('Online users');

    return html`
    	<div style="display: flex; align-items: center; gap: 1rem;">
    		<converse-avatar
    			.model=${model}
    			class="avatar"
    			name="${model.getDisplayName()}"
    			nonce=${model.vcard?.get('vcard_updated')}
    			height="72" width="72"
    		></converse-avatar>

    		<div>
    			<p style="margin-bottom: 0;"><strong>${i18n_name}:</strong> ${model.get('name')}</p>
    			<p style="margin-bottom: 0;"><strong>${i18n_online_users}:</strong> ${num_occupants}</p>
    		</div>
    	</div>
  `;
}
