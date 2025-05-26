
	const firebaseConfig = {
	  apiKey: "AIzaSyB1lbx-rlBf5m-cU4wZwLXmfhIDlj5tlJM",
	  authDomain: "cccmembershipca.firebaseapp.com",
	  projectId: "cccmembershipca",
	  storageBucket: "cccmembershipca.firebasestorage.app",
	  messagingSenderId: "654135748211",
	  appId: "1:654135748211:web:a5e0aa97d834d4a0942c06",
	};		
		let firebaseApp;
		let auth;
		let db;
		let currentUserGlobal = null; // Stores user object { uid, email, displayName, role }
		let dashboardInstance = null; // Holds the Dashboard instance

		try {
			if (typeof firebase !== 'undefined') {
				if (!firebase.apps.length) { // Initialize only if no apps exist
					console.log("Initializing new Firebase app...");
					firebaseApp = firebase.initializeApp(firebaseConfig);
					console.log("Firebase app initialized successfully.");
				} else {
					firebaseApp = firebase.app(); // Get default app if already initialized
					console.log("Firebase app already initialized. Using existing instance.");
				}
				auth = firebase.auth(firebaseApp);
				db = firebase.firestore(firebaseApp);
				console.log("Firebase Auth and Firestore services obtained.");
			} else {
				console.error("Firebase SDK (global 'firebase' object) not loaded!");
				alert("Critical Error: Firebase components could not be loaded.");
				auth = null; // Ensure auth is null if firebase isn't even defined
			}
		} catch (e) {
			console.error("Error during Firebase initialization process:", e);
			alert("Critical Error: Failed to initialize Firebase.");
			auth = null; // Ensure auth is null on error
		}

		// --- Helper Functions (storage, dateUtils, setElementHTML, showModal, showStatsPopup, showToast, getEditorName) ---
const storage = {
    load(key, def) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { console.error(`Storage load error for key "${key}":`, e); return def; } },
    save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.error(`Storage save error for key "${key}":`, e); } },
    sessionLoad(key, def) { try { const v = sessionStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; } },
    sessionSave(key, val) { try { sessionStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.error(`SessionStorage save error for key "${key}":`, e); } }
};

const dateUtils = {
    today() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; },
    
    parse(s) {
        if (!s) return null;

        // Check if 's' is a string in "YYYY-MM-DD" format
        if (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
            // Split the string and construct the date using local year, month, day.
            // This ensures the date is interpreted in the local timezone, not as UTC midnight.
            const parts = s.split('-');
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-indexed
            const day = parseInt(parts[2], 10);
            
            // Check for valid date components after parsing
            if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

            const d = new Date(year, month, day);
            // Further validation: ensure the date wasn't, e.g., Feb 30th which would roll over.
            // This check is good if the input string source isn't guaranteed to be valid.
            if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
                return isNaN(d.getTime()) ? null : d;
            }
            return null; // Invalid date components (e.g., month > 11 after parsing)
        }

        // For other string formats, or if 's' is already a Date object or a number (timestamp)
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
    },

    format(s) { 
        const d = this.parse(s); 
        // toLocaleDateString options can be added for specific formatting if needed
        return d ? d.toLocaleDateString(undefined, { timeZone: 'UTC' }) : ''; // Display the date as it was intended, effectively treating it as UTC for display of YYYY-MM-DD
    },
    // ... rest of your dateUtils functions (age, upcomingBirthday, upcomingAnniversary, inRange)
    // should now work correctly with the modified parse method.
    // For example, format could be:
    // format(s) { const d = this.parse(s); return d ? d.toLocaleDateString() : ''; }, 
    // The key was ensuring parse() creates the Date object correctly for YYYY-MM-DD strings.

    // Let's refine `format` to be more explicit about handling the already-parsed local date.
    // If parse() now correctly gives a local date object, toLocaleDateString() should be fine.
    // The problem arises if you want to display it as "YYYY-MM-DD" again, or if it's sent to a component
    // expecting a specific string.
    // For displaying in the UI like "5/21/2025", toLocaleDateString() after the corrected parse is usually sufficient.

    // Re-evaluating format - if parse now gives correct local date:
    format(s) { 
        const d = this.parse(s); 
        return d ? d.toLocaleDateString() : ''; // Default locale formatting for the correctly parsed local date
    },
    
    age(s) { 
        const b = this.parse(s); // 'b' will be local midnight of the birth date
        if (!b) return NaN; 
        const t = new Date(); // Current local date and time
        let a = t.getFullYear() - b.getFullYear(); 
        const m = t.getMonth() - b.getMonth(); 
        if (m < 0 || (m === 0 && t.getDate() < b.getDate())) {
            a--; 
        }
        return a; 
    },
    
    upcomingBirthday(s) { 
        const b = this.parse(s); // 'b' is local midnight of birth date
        if (!b) return null; 
        const t = this.today(); // 't' is local midnight of today
        let u = new Date(t.getFullYear(), b.getMonth(), b.getDate()); // Uses components of local birth date
        if (u < t) {
            u.setFullYear(t.getFullYear() + 1); 
        }
        return u; 
    },
    
    upcomingAnniversary(joinDateStr) { 
        const joinDate = this.parse(joinDateStr); // 'joinDate' is local midnight of join date
        if (!joinDate) return null; 
        const today = this.today(); // 'today' is local midnight of today
        let nextAnniversary = new Date(today.getFullYear(), joinDate.getMonth(), joinDate.getDate()); 
        if (nextAnniversary < today) { 
            nextAnniversary.setFullYear(today.getFullYear() + 1); 
        }
        const years = nextAnniversary.getFullYear() - joinDate.getFullYear(); 
        return { date: nextAnniversary, years: years }; 
    },
    
    inRange(d, r) { // 'd' is expected to be a Date object (local midnight)
        if (!d || !(d instanceof Date)) return false; 
        const t = this.today(); // local midnight today
        const e = new Date(t); 
        if (r > 0) {
            e.setDate(t.getDate() + r); 
        } else { // r === 0 means "all upcoming", so effectively a very large positive range
            e.setFullYear(t.getFullYear() + 100); 
        }
        // Ensure d is also at midnight for fair comparison if it comes with time
        const dMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        return dMidnight >= t && dMidnight <= e; 
    }
};
window.dateUtils = dateUtils; // Expose for debugging if needed

function setElementHTML(element, htmlString) {
    if (!element) {
        console.error("setElementHTML: Target element is null for HTML:", String(htmlString).substring(0, 100) + "...");
        return;
    }
    try {
        let child;
        while ((child = element.firstChild)) {
            element.removeChild(child);
        }
        const range = document.createRange();
        range.selectNodeContents(element);
        const fragment = range.createContextualFragment(htmlString);
        element.appendChild(fragment);
    } catch (e) {
        console.error("Error in setElementHTML with createContextualFragment:", e, "HTML (first 100 chars):", String(htmlString).substring(0, 100));
        try {
            console.warn("Falling back to direct innerHTML assignment for element:", element);
            element.innerHTML = htmlString; // Fallback
        } catch (trustedTypesError) {
            console.error("TrustedHTML error on fallback innerHTML:", trustedTypesError);
            element.textContent = "Error: Could not render content due to page security policy.";
        }
    }
}
	function showModal(title, contentHTML, buttonsConfig = [{ label: "Close", action: (modal) => modal.remove() }], customModalClass = '') {
    // Ensure body.classList.remove('modal-open') happens when this modal closes too
    // Or make showModal only for non-auth related modals if stats_popup is different
    const existingModal = document.getElementById('mmd_modal_overlay');
    if (existingModal) existingModal.remove();

	   const overlay = document.createElement('div');
    overlay.id = 'mmd_modal_overlay';
    const modalContentElHost = document.createElement('div');
    setElementHTML(modalContentElHost, `<div class="mmd_modal_content ${customModalClass}"><div class="mmd_modal_header"><h2 id="mmd_modal_title_text"></h2><button class="mmd_modal_close_btn">×</button></div><div class="mmd_modal_body" id="mmd_modal_body_content"></div><div class="mmd_modal_footer"></div></div>`);
    const modalContentRealEl = modalContentElHost.firstChild;
    overlay.appendChild(modalContentRealEl);
    document.body.appendChild(overlay);

    const titleEl = modalContentRealEl.querySelector('#mmd_modal_title_text');
    const bodyEl = modalContentRealEl.querySelector('#mmd_modal_body_content');
    const closeBtnEl = modalContentRealEl.querySelector('.mmd_modal_close_btn');
    const footerEl = modalContentRealEl.querySelector('.mmd_modal_footer');


    if (titleEl) titleEl.textContent = title;
    if (bodyEl) setElementHTML(bodyEl, contentHTML);

    const closeModalCleanup = () => {
        if (overlay.parentNode) overlay.remove();
        // Check if OTHER modals are open before removing body class
        if (!document.getElementById('stats_popup_overlay') && !document.getElementById('mmd_modal_overlay')) { // Check for both types
            document.body.classList.remove('modal-open');
        }
    };

    if (closeBtnEl) closeBtnEl.onclick = closeModalCleanup;
    overlay.onclick = (e) => { if (e.target === overlay) closeModalCleanup(); };

    if (buttonsConfig.length === 0 && footerEl && footerEl.children.length === 0) {
        buttonsConfig = [{ label: "Close", action: () => { /* Handled by cleanup */ } }];
    }
    if (footerEl && buttonsConfig) {
        buttonsConfig.forEach(btnConfig => {
            const button = document.createElement('button');
            button.textContent = btnConfig.label;
            button.className = btnConfig.className || 'generic_button_styles';
            if (btnConfig.style) button.style.cssText = btnConfig.style;
            button.onclick = () => {
                if (typeof btnConfig.action === 'function') btnConfig.action(overlay, modalContentRealEl);
                if ((btnConfig.label.toLowerCase() === "close" || buttonsConfig.length === 1) && overlay.isConnected) closeModalCleanup();
                else if (!overlay.isConnected && document.body.classList.contains('modal-open')) document.body.classList.remove('modal-open');
            };
            footerEl.appendChild(button);
        });
    }
    if (footerEl && footerEl.children.length === 0) footerEl.style.display = 'none';
    return overlay;
}

		function showStatsPopup(title, contentHTML, onFilterApplyCallback) {
		// Remove any existing stats popup first
		const existingPopup = document.getElementById('stats_popup_overlay');
		if (existingPopup) {
			existingPopup.remove();
		}
		document.body.classList.add('modal-open'); // Prevent body scroll

		// Create overlay
		const overlay = document.createElement('div');
		overlay.id = 'stats_popup_overlay';

		// Create popup content structure
		const popupContent = document.createElement('div');
		popupContent.id = 'stats_popup_content';

		// Header
		const header = document.createElement('div');
		header.id = 'stats_popup_header';
		const titleEl = document.createElement('h2');
		titleEl.textContent = title;
		const closeBtn = document.createElement('button');
		closeBtn.id = 'stats_popup_close_btn';
		closeBtn.innerHTML = '&times;';
		header.appendChild(titleEl);
		header.appendChild(closeBtn);

		// Body (where the stats and filters will go)
		const body = document.createElement('div');
		body.id = 'stats_popup_body';
		setElementHTML(body, contentHTML); // Inject the pre-formatted HTML

		// Footer (for the main close button of this popup)
		const footer = document.createElement('div');
		footer.id = 'stats_popup_footer';
		const mainCloseButton = document.createElement('button');
		mainCloseButton.textContent = "Close";
		mainCloseButton.className = "generic_button_styles"; // Use your existing button style
		footer.appendChild(mainCloseButton);

		popupContent.appendChild(header);
		popupContent.appendChild(body);
		popupContent.appendChild(footer);
		overlay.appendChild(popupContent);
		document.body.appendChild(overlay);

		// Event Listeners
		const closePopup = () => {
			overlay.remove();
			document.body.classList.remove('modal-open');
		};

		closeBtn.onclick = closePopup;
		mainCloseButton.onclick = closePopup;
		overlay.onclick = (e) => {
			if (e.target === overlay) {
				closePopup();
			}
		};

		// Handle filter apply button if it exists in the contentHTML
		const applyFilterBtn = body.querySelector('#apply_group_stats_age_filter_btn');
		if (applyFilterBtn && typeof onFilterApplyCallback === 'function') {
			applyFilterBtn.onclick = () => {
				const minAgeInput = body.querySelector('#group_stats_min_age');
				const maxAgeInput = body.querySelector('#group_stats_max_age');
				const newMinAge = minAgeInput ? minAgeInput.value : null;
				const newMaxAge = maxAgeInput ? maxAgeInput.value : null;
				onFilterApplyCallback(newMinAge, newMaxAge); // Call the callback to update content
			};
		}
		return { overlay, body, titleEl }; // Return useful elements if needed
	}
function showToast(msg, type = 'info', duration = 3500) {
    let toastContainer = document.getElementById('mmd_toast_container');
    if (!toastContainer && dashboardInstance && dashboardInstance.getAppContainer) { // Check if dashboard can provide it
        const appContainer = dashboardInstance.getAppContainer();
        if (appContainer) toastContainer = appContainer.querySelector('#mmd_toast_container');
    }
    if (!toastContainer) { // If still not found, create and append to body as a last resort
        toastContainer = document.createElement('div');
        toastContainer.id = 'mmd_toast_container';
        document.body.appendChild(toastContainer);
        console.log("Created #mmd_toast_container because it was not found.");
    }
    const t = document.createElement('div'); t.className = `toast_msg toast_${type}`; t.textContent = msg; toastContainer.appendChild(t); setTimeout(() => t.remove(), duration);
}
		async function getEditorName(action = "perform this action") { return new Promise((resolve) => { const content = `<p>Please enter your name to ${action}:</p><input type="text" id="editor_name_input" class="mmd_modal_input" placeholder="Your Name" style="width: 100%; padding: 8px; margin-top: 5px;">`; const modal = showModal("Confirm Action", content, [ { label: "Confirm", action: (modalInstance, modalContentScope) => { const nameInput = modalContentScope.querySelector('#editor_name_input'); const name = nameInput ? nameInput.value.trim() : ''; if (name) { modalInstance.remove(); resolve(name); } else { showToast("Editor name is required.", "error"); if(nameInput) nameInput.style.borderColor = 'red'; } }}, { label: "Cancel", action: (modalInstance) => { modalInstance.remove(); resolve(null); } } ]); if (!modal) resolve(prompt(`(Modal failed) Please enter your name to ${action}:`)); }); }

		const tpl = { /* HTML Templates remain the same */
			home: `
			  <div id="home_panels">
				<div class="panel3d" id="panel_counts">
				  <h3>🔢 Member Total</h3>
				  <div>Total Members: <span id="cnt_members">0</span></div>
				  <div>Total Households: <span id="cnt_households">0</span></div>
				  <div>Pastors: <span id="cnt_pastors" class="clickable-count" title="Click to view list">0</span></div>
				  <div>Deacons: <span id="cnt_deacons" class="clickable-count" title="Click to view list">0</span></div><br>
								<div class="map_panel" id="map_home"></div>
				</div>
		 <div class="panel3d" id="panel_gender">
		  <h3><span class="icon">🚻</span>Total By Gender</h3>
		  <div class="chart-with-stats-container">
			<canvas id="chart_gender"></canvas>
			
			<div class="chart-stats-text" id="gender_stats_text">
			  
			</div>
		  </div>
		  
		</div>
		<div class="panel3d" id="panel_group">
		  <h3><a id="home_group_chart_title_link" title="Click for aggregated stats or click a slice for specific group" style="cursor:pointer;"><span class="icon">🏠</span>Group in Relnak</a></h3>
		  <div class="chart-with-stats-container"> 
			<canvas id="chart_group"></canvas>
			<div class="chart-stats-text" id="group_stats_text">
			  </div>
			</div>           
				</div>
				<div class="panel3d" id="panel_age">
				  <h3>🎂 Kum in Relnak</h3>
				  <div>
					<label>From <input type="number" id="age_min" value="0" style="width:70px; padding: 5px;"></label>
					<label>to <input type="number" id="age_max" value="120" style="width:70px; padding: 5px;"></label>
				<!--    <button id="btn_age_filter" class="generic_button_styles" style="padding:8px 12px; margin-left:5px;">Filter</button> -->
				  </div>
				  <canvas id="chart_age"></canvas>
				  <p>*Duhnak zawn kum poah in rel khawh nak</p>
				</div>
				<div class="panel3d" id="panel_dist">
				  <h3>📊 Zohṭinak</h3>
				  <select id="dist_field" style="padding: 5px;">
				  <option value="homeGroup">Home Group</option>
					<option value="gender">Gender</option>
									<option value="marital">Marital Status</option>
				  </select>
				  <canvas id="chart_dist"></canvas>
				</div>
				<div class="panel3d" id="panel_reg">
				  <h3>📈 Registrations Over Time</h3>
				  <select id="reg_year" style="padding: 5px;"></select>
				  <canvas id="chart_reg"></canvas>
				</div>
			  </div>
			`,

	register: `
	<p style="text-align: center; grid-column: span 2; font-size:0.9em;"><em>Innkhat ah a umṭi mi member vialte  kha hmunkhat te ah khumh ṭi ding.</em></p>
	  <form id="mmd_form" style="align-items: center;">

        <fieldset class="fieldset-main">
            <legend>Head of Household</legend>
            <label class="required">Full Name<input id="f_name" required></label>

            <div class="full-width profile-pic-area">
                <label for="f_profile_pic">Profile Picture</label>
                <input type="file" id="f_profile_pic" accept="image/*">
                <img id="f_profile_pic_preview" src="#" alt="Profile Preview" style="display: none;"/>
                <img id="f_s_profile_pic_preview" style="display:none;" />
                <img id="c_profile_pic_preview0" style="display:none;" />
                <img id="or_profile_pic_preview0" style="display:none;" />
            </div>

            <label class="required">DOB<input type="date" id="f_dob" required></label>
            <label>Gender<select id="f_gender"><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></label>
            <label class="required">Joined<input type="date" id="f_join" required></label>
            <label class="required">Phone<input type="tel" id="f_phone" required></label>
            <label class="full-width required">Email<input type="email" id="f_email" required></label>
            <label class="full-width required">Address<input id="f_addr" required></label>
            <label>Baptism<select id="f_bapt"><option value="">--Select--</option><option>Baptized</option><option>Not Baptized</option></select></label>
            <label>Position<select id="f_pos"><option>Member</option><option>Pastor</option><option>Deacon</option></select></label>
            <label>Home Group<select id="f_group"><option value="">--Select--</option><option>A</option><option>B</option><option>C</option><option>D</option><option>Unknown</option></select></label>
            <label>Marital Status<select id="f_marital">
                <option value="Single" selected>Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
                <option value="Other">Other</option>
            </select></label>
        </fieldset>

		<fieldset id="spouse_section" class="conditional-section full-width">
			<legend>Spouse Details</legend>
			<label>Spouse's Full Name<input id="f_s_name"></label>
			<label>Spouse's DOB<input type="date" id="f_s_dob"></label>
			<label>Spouse's Gender<select id="f_s_gender"><option value="Female">Female</option><option value="Male">Male</option><option value="Other">Other</option></select></label>
			<label>Spouse's Joined Date<input type="date" id="f_s_join"></label>
			<label>Spouse's Phone<input type="tel" id="f_s_phone"></label>
			<label class="full-width">Spouse's Email<input type="email" id="f_s_email"></label>
			<label class="full-width">Spouse's Address<input id="f_s_addr"></label>
			<label>Spouse's Baptism<select id="f_s_bapt"><option value="">--Select--</option><option>Baptized</option><option>Not Baptized</option></select></label>
			<label>Spouse's Position<select id="f_s_pos"><option>Member</option><option>Pastor</option><option>Deacon</option></select></label>
		</fieldset>

        <fieldset class="full-width">
            <legend>Children</legend>
		    <label>Children count<input type="number" id="f_children" min="0" value="0"></label>
		    <div id="children_section" class="conditional-section full-width no-border">
			    <div id="children_section_fields"></div>
		    </div>
        </fieldset>

        <fieldset class="full-width">
            <legend>Other Relatives</legend>
            <label>Other Relatives in Household
                <input type="number" id="f_other_relatives_count" min="0" value="0" style="margin-top:5px;">
            </label>
            <div id="other_relatives_section" class="conditional-section full-width no-border">
                <div id="other_relatives_section_fields"></div>
            </div>
        </fieldset>

		 <button type="submit" style="margin:5px 5px; max-width: 250px; max-height: 50px;">Register Household</button>
	  </form>
	`,

	view: `
	  <div id="member_view_controls">

		<input type="search" id="member_search_input" placeholder="Search..." style="min-width:250px; flex-basis: 300px; margin-bottom:5px;">
	   <fieldset class="filter-group">
				  <legend>Home Group</legend>
				  <select id="member_filter_group"><option value="">All</option><option>A</option><option>B</option><option>C</option><option>D</option><option>Unknown</option></select>
				</fieldset>
				<fieldset class="filter-group">
				  <legend>Position</legend>
				  <select id="member_filter_position"><option value="">All</option><option>Member</option><option>Pastor</option><option>Deacon</option></select>
				</fieldset>
				<fieldset class="filter-group">
				  <legend>Gender</legend>
				  <select id="member_filter_gender"><option value="">All</option><option>Male</option><option>Female</option><option>Other</option></select>
				</fieldset>
				<fieldset class="filter-group">
				  <legend>Marital Status</legend>
				  <select id="member_filter_marital"><option value="">All</option><option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option><option>Other</option></select>
				</fieldset>
		<button id="clear_member_filters_btn" class="generic_button_styles" style="padding:8px 12px; align-self:flex-end;">Clear Filters</button>
        <button id="show_favorites_btn" class="generic_button_styles" style="padding:8px 12px; align-self:flex-end; background-color: #ffc107; color: #333;">
            ⭐ Show Favorites (<span id="fav_count">0</span>)
        </button>
        </div>


	  <div id="route_planner_dynamic_bar" style="
			display: none;
			position: sticky;
			top: 0;

			
			padding: 10px;
			z-index: 999;
			box-shadow: 0 2px 5px rgba(0,0,0,0.1);
			text-align: center;
			border-bottom: 1px solid var(--sec);
		">
		<span style="margin-right:15px; color: var(--fg); font-weight:bold;">
			Selected: <span id="dynamic_selected_count">0</span>
		</span>
        <div class="dynamic-button-group">
		    <button id="btn_dynamic_generate_route" class="generic_button_styles" disabled>Plan Optimized Route</button>
            <button id="btn_dynamic_add_favorites" class="generic_button_styles" style="background-color: #ffc107; color: #333;" disabled>
                ⭐ Add to Favorites
            </button>
		    <button id="btn_dynamic_clear_route" class="generic_button_styles danger">Clear Selection</button>
        </div>

	  <button id="toggle_view" class="generic_button_styles" style="margin-bottom: 15px; margin-top:10px;">Toggle View</button>
	  <div id="view_content">

	  </div>
	`,

	reminders: `
	  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
		<h3>🎂 Birthday & 🎉 Anniversary Reminders</h3>
		<button id="toggle_reminder_view" class="generic_button_styles">Switch to List View</button>
	  </div>
	  <div class="panel3d" style="transform: rotateX(0) rotateY(0); margin-bottom:20px; display:grid; grid-template-columns:1fr 1fr; gap:20px;">
		<div>
		  <label for="sel_birthday_range" style="font-size: 1.2rem;">Upcoming Birthdays in (days):</label>
		  <select id="sel_birthday_range" style="margin-bottom:10px; width:100%;background: var(--accent); color: var(--fg);">
			${[1,2,3,4,5,6,7,15,30,60,90,365,0].map(r=>`<option value="${r}">${r===0?'All Upcoming':r+' days'}</option>`).join('')}
		  </select>
		</div>
		<div>
		  <label for="sel_anniversary_range" style="font-size: 1.2rem;">Upcoming Anniversaries in (days):</label>
		  <select id="sel_anniversary_range" style="margin-bottom:10px; width:100%;background: var(--accent); color: var(--fg);">
			${[1,2,3,4,5,6,7,15,30,60,90,365,0].map(r=>`<option value="${r}">${r===0?'All Upcoming':r+' days'}</option>`).join('')}
		  </select>
		</div>
	  </div>
	  
	  
	  <div class="reminders-columns-container"> 
		<div class="reminder-column"> 
		  <h4 class="reminder-heading">Birthdays</h4> 
		  <div id="list_birth" class="card_view"></div>
		</div>
		<div class="reminder-column"> 
		  <h4 class="reminder-heading">Anniversaries (Membership)</h4> 
		  <div id="list_anniversary" class="card_view"></div>
		</div>
	  </div>
	`,
		
	routePlanner: `
		<div id="page_route_planner_content" class="panel3d" style="transform: none; box-shadow: var(--shadow-color-light) 0px 1px 3px 0px, var(--shadow-color-dark) 0px 4px 8px 0px; margin:10px;">
			<h3 style="text-align:center;">🚗 Visitation Route Planner</h3>
			<p style="text-align:center; font-size:0.9em; color:var(--fg-muted);">
				Select households from the "View Members" tab (Table View). Then, generate a route.
			</p>
			
			<div id="visitation_list_selection" style="margin-top: 20px; padding: 10px; background: var(--bg-alt, #f9f9f9); border-radius: 6px;">
				<h4>Selected Households for Route (<span id="selected_household_count">0</span>):</h4>
				<ul id="selected_households_for_route" style="list-style: decimal; padding-left: 20px; max-height: 200px; overflow-y: auto;">
					{/* Selected households will be listed here */}
				</ul>
				<p id="route_selection_placeholder" style="font-style: italic; color: var(--fg-muted); display: block;">No households selected yet.</p>
			</div>

			<div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--sec);">
				<button id="btn_clear_route_selection" class="generic_button_styles danger" style="margin-right:10px;">Clear Selection</button>
				<button id="btn_generate_route_link" class="generic_button_styles" disabled>Generate Optimized Route</button>
			</div>

			<div id="route_link_output" style="margin-top:20px; text-align:center;">
				
			</div>
			<p style="text-align:center; font-size:0.8em; color:var(--fg-muted); margin-top:15px;">
				Note: Google Maps will attempt to optimize the order of waypoints. Max 10 waypoints generally work well for optimization.
			</p>
		</div>
	`,

		audit(logs) {
				let rows = logs.map(l => `<tr><td>${new Date(l.ts).toLocaleString()}</td><td>${l.editor || 'N/A'}</td><td>${l.action}</td><td>${l.details.replace(/\n/g, '<br>')}</td><td>${(l.reason || '').replace(/\n/g, '<br>')}</td></tr>`).join('');
				return `<div style="overflow-x:auto;"><table id="mmd_table"><thead><tr><th>Timestamp</th><th>Editor</th><th>Action</th><th>Details</th><th>Reason</th></tr></thead><tbody>${rows}</tbody></table></div>`;
			},
			importExport: `
					<div class="panel3d" id="panel_export"><h3>📤 Export Data</h3><button id="export_json_btn" class="generic_button_styles">Export All Data to JSON</button><button id="export_members_csv_btn" class="generic_button_styles">Export Members to CSV</button><button id="export_pdf_btn" class="generic_button_styles">Export Members to PDF (Guide)</button><p style="font-size:0.8em; margin-top:10px;">For PDF, use browser's Print-to-PDF on table view.</p></div>
					<div class="panel3d" id="panel_import"><h3>📥 Import Data (JSON)</h3><p><strong>Warning:</strong> Importing will overwrite existing data. Backup first.</p><label for="import_json_file_input" class="generic_button_styles" style="display:inline-block; margin-bottom:10px;">Choose JSON File</label><input type="file" id="import_json_file_input" accept=".json" style="display:none;"><span id="json_file_name_display">No file chosen</span><br><button id="import_json_data_btn" class="generic_button_styles danger" style="margin-top:10px;">Import from JSON</button></div>`
		};

		// --- Data Access (placeholders, to be replaced with Firebase logic) ---
		const STORAGE_KEY_PREFIX = 'mmd_v4.4.5_';
		const MEMBERS_STORAGE_KEY = `${STORAGE_KEY_PREFIX}members`;
		const DELETED_MEMBERS_STORAGE_KEY = `${STORAGE_KEY_PREFIX}deleted_members`;
		const AUDIT_STORAGE_KEY = `${STORAGE_KEY_PREFIX}audit`;
		const THEME_STORAGE_KEY = `${STORAGE_KEY_PREFIX}theme`;
		const VIEW_MODE_STORAGE_KEY = `${STORAGE_KEY_PREFIX}viewMode`;
		const REMINDER_VIEW_MODE_STORAGE_KEY = `${STORAGE_KEY_PREFIX}reminderViewMode`;
		const REMINDER_ACK_STORAGE_KEY_PREFIX = `${STORAGE_KEY_PREFIX}reminderAck_`;
		const REMINDER_BIRTHDAY_RANGE_KEY = `${STORAGE_KEY_PREFIX}reminderBirthdayRange`;
		const REMINDER_ANNIVERSARY_RANGE_KEY = `${STORAGE_KEY_PREFIX}reminderAnniversaryRange`;
		// ... other storage keys ...

		function getMembers() { return storage.load(MEMBERS_STORAGE_KEY, []); }
		function saveMembers(m) { storage.save(MEMBERS_STORAGE_KEY, m); console.log("Members saved, new count:", m.length); }
		function getDeletedMembers() { return storage.load(DELETED_MEMBERS_STORAGE_KEY, []); }
		function saveDeletedMembers(m) { storage.save(DELETED_MEMBERS_STORAGE_KEY, m); }
		function getAudit() { return storage.load(AUDIT_STORAGE_KEY, []); }
		function saveAudit(a) { storage.save(AUDIT_STORAGE_KEY, a); }
		async function logAction(action, details, reason = '', editor = 'System') {
			if (!db) {
				console.error("Firestore db is not initialized. Cannot log action.");
				// Potentially fallback to localStorage or show an error if this is critical
				return;
			}
			try {
				await db.collection('audit_logs').add({
					timestamp: firebase.firestore.FieldValue.serverTimestamp(),
					editor: editor, // CHANGED from 'editorName' to 'editor'
					action: action,
					details: details,
					reason: reason
				});
				console.log("Action logged to Firestore:", action, "by Editor:", editor);
			} catch (error) {
				console.error("Error logging action to Firestore:", error);
				// Optionally, show a non-critical toast to the user if logging fails
				// showToast("Could not save audit log entry.", "warning");
			}
		}
		// --- Main Application Logic ---
		document.addEventListener('DOMContentLoaded', () => {
			console.log("CCC Dashboard: DOMContentLoaded - Initializing App.");

			if (!auth || !db) {
				document.body.innerHTML = "<p style='color:red; text-align:center; font-size:1.2em; padding:20px;'>Critical Error: Firebase services not initialized. Cannot start app.</p>";
				return;
			}

			const loginScreenEl = document.getElementById('login_screen');
			const mainAppContainerEl = document.getElementById('mmd_container'); // Must exist in index.html
			const loginForm = document.getElementById('login_form');
			const signupLink = document.getElementById('signup_link');
			const resetLink = document.getElementById('reset_link');
			const rememberCheckbox = document.getElementById('remember_me');
			const spinner = document.getElementById('spinner');
			const googleBtn = document.getElementById('google_login_btn');
			const msBtn = document.getElementById('microsoft_login_btn');
			const logoutBtnGlobal = document.getElementById('logout_btn_global'); // Must exist in index.html

			// New elements for Signup Form
			const signupFormContainer = document.getElementById('signup_form_container');
			const mmdSignupForm = document.getElementById('mmd_signup_form');
			const backToLoginLink = document.getElementById('back_to_login_link');
			// Note: signup_error div is handled within its submit handler

			function displayLoginScreen() {
				console.log("Switching to Login Screen");
				if (loginScreenEl) loginScreenEl.style.display = 'flex';
				if (mainAppContainerEl) mainAppContainerEl.style.display = 'none';
				if (logoutBtnGlobal) logoutBtnGlobal.style.display = 'none';
				if (dashboardInstance && typeof dashboardInstance.destroy === 'function') {
					dashboardInstance.destroy();
				}
				dashboardInstance = null;
				if (mainAppContainerEl) setElementHTML(mainAppContainerEl, ''); // Clear app content
			}

			async function displayAppScreen(userWithRoleObject) {
					if (!userWithRoleObject || typeof userWithRoleObject.email !== 'string') {
						console.error("Invalid userWithRoleObject passed to displayAppScreen:", userWithRoleObject);
						showToast("Dashboard error: Invalid user session data.", "error");
						return;
					}
				console.log(`Switching to App Screen for user: ${userWithRoleObject.email}, role: ${userWithRoleObject.role}`);
				if (loginScreenEl) loginScreenEl.style.display = 'none';
				if (mainAppContainerEl) mainAppContainerEl.style.display = 'flex'; // Assuming #mmd_container should be display:flex
				if (logoutBtnGlobal) logoutBtnGlobal.style.display = 'inline-block';

				if (!dashboardInstance) {
					console.log("Creating new Dashboard instance.");
					dashboardInstance = new Dashboard(userWithRoleObject, userWithRoleObject.role);
				} else {
					console.log("Dashboard instance exists. Updating user/role and applying restrictions.");
					dashboardInstance.user = userWithRoleObject; // Update user on existing instance
					dashboardInstance.role = userWithRoleObject.role; // Update role
					dashboardInstance.applyRoleRestrictions(); // Re-apply UI restrictions
				}
			}

			auth.onAuthStateChanged(async (user) => {
				toggleSpinner(true);
				const loginScreenEl = document.getElementById('login_screen'); // Ensure this is defined in the scope
				const mainAppContainerEl = document.getElementById('mmd_container'); // Ensure this is defined
				const logoutBtnGlobal = document.getElementById('logout_btn_global'); // Ensure this is defined
				const signupFormContainer = document.getElementById('signup_form_container'); // Get signup form if you want to hide it too

				if (user) {
					let enrichedUser = {
						uid: user.uid,
						email: user.email,
						displayName: user.displayName || user.email.split('@')[0],
						role: 'viewer' // Default role, will be updated
					};

					const userRef = db.collection('users').doc(user.uid);
					try {
						const userDoc = await userRef.get();
						let roleFromFirestore = 'viewer';

						if (userDoc.exists) {
							const userData = userDoc.data();
							await userRef.update({ lastLogin: firebase.firestore.FieldValue.serverTimestamp() });
							roleFromFirestore = userData.role || 'viewer';
							enrichedUser.displayName = userData.displayName || enrichedUser.displayName;
							enrichedUser.email = userData.email || enrichedUser.email;
						} else {
							console.warn(`Firestore document for user ${user.email} not found. Creating one.`);
							await userRef.set({
								email: enrichedUser.email,
								displayName: enrichedUser.displayName,
								phone: '', // Assuming phone is not available in this fallback
								role: 'viewer',
								createdAt: firebase.firestore.FieldValue.serverTimestamp(),
								lastLogin: firebase.firestore.FieldValue.serverTimestamp()
							}, { merge: true });
							roleFromFirestore = 'viewer';
							showToast(`Welcome! Profile for ${user.email} initialized.`, 'info', 7000);
						}

						enrichedUser.role = roleFromFirestore;
						currentUserGlobal = enrichedUser;
						console.log(`User ${enrichedUser.email} signed in. Role: ${enrichedUser.role}`);

						// ----- UI Transition: Hide Login/Signup, Prepare for App -----
						if (loginScreenEl) loginScreenEl.style.display = 'none';
						if (signupFormContainer) signupFormContainer.style.display = 'none'; // Hide signup form too
						// mainAppContainerEl will be made visible by dashboardInstance.init() or explicitly below
						if (logoutBtnGlobal) logoutBtnGlobal.style.display = 'inline-block';
						// ----- End UI Transition -----

						if (!dashboardInstance) {
							console.log("CCC Dashboard: onAuthStateChanged - Creating new Dashboard instance."); // LOG
							dashboardInstance = new Dashboard(enrichedUser, enrichedUser.role);
                            console.log("CCC Dashboard: onAuthStateChanged - Calling initializeData..."); // LOG
							const dataLoadedSuccessfully = await dashboardInstance.initializeData();
                            console.log("CCC Dashboard: onAuthStateChanged - initializeData returned:", dataLoadedSuccessfully); // LOG

							if (dataLoadedSuccessfully) {
                                console.log("CCC Dashboard: onAuthStateChanged - Calling dashboardInstance.init()."); // LOG
								dashboardInstance.init();
								dashboardInstance.applyRoleRestrictions();


								let firstTabClicked = false;
								const homeButton = dashboardInstance.getAppContainer()?.querySelector('#mmd_tabs button[data-page="home"]');
								if (homeButton && !homeButton.disabled) {
									homeButton.click();
									firstTabClicked = true;
								} else {
									const tabs = dashboardInstance.getAppContainer()?.querySelectorAll('#mmd_tabs button[data-page]');
									if (tabs) {
										for (const tab of tabs) {
											if (!tab.disabled) {
												tab.click();
												firstTabClicked = true;
												break;
											}
										}
									}
								}
								if (!firstTabClicked) {
									console.warn("No accessible tabs found for the current user.");
									const appContainer = dashboardInstance.getAppContainer();
									if (appContainer) {
										setElementHTML(appContainer, "<div class='mmd_page active' style='padding:20px;text-align:center;'>No content available for your user role.</div>");
									}
								}
					} else {
                                console.log("CCC Dashboard: onAuthStateChanged - Data load FAILED. Logging out."); // LOG
								showToast("Failed to load dashboard data. Logging out.", "error", 10000);
								if (auth) auth.signOut();
								toggleSpinner(false);
								return;
							}
						} else { // Dashboard instance exists
                            console.log("CCC Dashboard: onAuthStateChanged - Dashboard instance EXISTS. Updating user/role and refreshing."); //LOG
     
							dashboardInstance.user = enrichedUser;
							dashboardInstance.role = enrichedUser.role;

							// Ensure main app container is visible if we are not calling init() again
							if (mainAppContainerEl) mainAppContainerEl.style.display = 'flex';

							const dataReloaded = await dashboardInstance.initializeData();
							if (dataReloaded) {
								dashboardInstance.applyRoleRestrictions();
								const activePageButton = dashboardInstance.getAppContainer()?.querySelector('#mmd_tabs button.active[data-page]');
								let refreshed = false;
								if (activePageButton && !activePageButton.disabled) {
									const pageKey = activePageButton.dataset.page;
									const loadFunctionName = 'load' + pageKey.charAt(0).toUpperCase() + pageKey.slice(1);
									if (typeof dashboardInstance[loadFunctionName] === 'function') {
										try { dashboardInstance[loadFunctionName](); refreshed = true; } catch (e) { console.error(`Error reloading active page ${pageKey}`, e); }
									}
								}
								if (!refreshed) { // Fallback to first available tab if active one couldn't be refreshed
									dashboardInstance.getAppContainer()?.querySelector('#mmd_tabs button[data-page]:not([disabled])')?.click();
								}
							} else {
								showToast("Failed to refresh dashboard data. Logging out.", "error", 10000);
								if (auth) auth.signOut();
								toggleSpinner(false); // Ensure spinner is off
								return;
							}
						}
					} catch (error) {
						console.error("Error during onAuthStateChanged user processing:", error);
						showLoginError({ message: "An error occurred while accessing your data. Please try logging in again." });
						if (auth && typeof auth.signOut === 'function') {
							auth.signOut().catch(signOutError => console.error("Error signing out after onAuthStateChanged error:", signOutError));
						} else {
							// If auth or signOut is problematic, manually ensure login screen is displayed
							displayLoginScreen();
						}
						// displayLoginScreen() will be called by user=null if signOut is successful
					}
				} else { // No user (signed out or auth not ready)
					currentUserGlobal = null;
					if (dashboardInstance && typeof dashboardInstance.destroy === 'function') {
						// dashboardInstance.destroy(); // Call if you implement a cleanup method
					}
					dashboardInstance = null;
					console.log("User signed out or no user session.");
					displayLoginScreen(); // This function correctly shows login and hides the app
				}
				toggleSpinner(false);
			});


			if (loginForm) {
				loginForm.addEventListener('submit', (e) => {
					e.preventDefault();
					toggleSpinner(true);
					const errorEl = document.getElementById('login_error');
					if(errorEl) errorEl.textContent = '';
					const email = document.getElementById('login_email').value;
					const password = document.getElementById('login_password').value;
					const remember = rememberCheckbox ? rememberCheckbox.checked : false;
					const persistence = remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION;

					auth.setPersistence(persistence)
						.then(() => auth.signInWithEmailAndPassword(email, password))
						.catch(showLoginError)
						.finally(() => toggleSpinner(false));
				});
			}
		   if (signupLink) {
				signupLink.onclick = (e) => {
					e.preventDefault();
					if (loginForm) loginForm.style.display = 'none';
					if (signupFormContainer) signupFormContainer.style.display = 'block'; // Or your preferred display type
					
					const loginErrorEl = document.getElementById('login_error');
					if (loginErrorEl) loginErrorEl.style.display = 'none'; // Hide login errors
				};
			}

			// NEW: backToLoginLink onclick handler
			if (backToLoginLink) {
				backToLoginLink.onclick = (e) => {
					e.preventDefault();
					if (signupFormContainer) signupFormContainer.style.display = 'none';
					if (loginForm) loginForm.style.display = 'block'; // Or your preferred display type

					const signupErrorEl = document.getElementById('signup_error');
					if (signupErrorEl) signupErrorEl.style.display = 'none'; // Hide signup errors
				};
			}

			if (resetLink) {
				resetLink.onclick = () => {
					const email = prompt("Enter your email for password reset link:");
					if (email) {
						toggleSpinner(true);
						document.getElementById('login_error').textContent = '';
						auth.sendPasswordResetEmail(email)
							.then(() => showToast("Password reset email sent if account exists.", "info", 4000))
							.catch(showLoginError)
							.finally(() => toggleSpinner(false));
					}
				};
			}
			const googleProvider = new firebase.auth.GoogleAuthProvider(); // Define providers here
			const microsoftProvider = new firebase.auth.OAuthProvider('microsoft.com');

			if (googleBtn) {
				googleBtn.onclick = () => {
					toggleSpinner(true);
					document.getElementById('login_error').textContent = '';
					auth.signInWithPopup(googleProvider).catch(showLoginError).finally(() => toggleSpinner(false));
				};
			}
			if (msBtn) {
				msBtn.onclick = () => {
					toggleSpinner(true);
					document.getElementById('login_error').textContent = '';
					auth.signInWithPopup(microsoftProvider).catch(showLoginError).finally(() => toggleSpinner(false));
				};
			}



/*		const logoutBtn = document.createElement('button');
		logoutBtn.id = 'logout_btn';
		logoutBtn.textContent = 'Logout';
		logoutBtn.className = 'generic_button_styles danger';
		logoutBtn.style.position = 'absolute';
		logoutBtn.style.top = '10px';
		logoutBtn.style.right = '10px';
		logoutBtn.onclick = () => auth.signOut();

		document.body.appendChild(logoutBtn); 

			if (logoutBtnGlobal) { // Ensure this button exists in index.html
				logoutBtnGlobal.addEventListener('click', () => {
					if (auth) {
						auth.signOut().then(() => {
							console.log("User signed out via global button.");
							// onAuthStateChanged will handle UI switch
						}).catch(error => {
							console.error("Global logout error:", error);
							showToast("Error signing out.", "error");
						});
					}
				});
			}

*/

		   // NEW: Signup form submit handler
			if (mmdSignupForm) {
				mmdSignupForm.addEventListener('submit', async (e) => {
					e.preventDefault();
					toggleSpinner(true);

					const signupErrorEl = document.getElementById('signup_error');
					if (signupErrorEl) {
						signupErrorEl.textContent = '';
						signupErrorEl.style.display = 'none';
					}

					const fullName = document.getElementById('signup_name').value.trim();
					const email = document.getElementById('signup_email').value.trim();
					const phone = document.getElementById('signup_phone').value.trim();
					const password = document.getElementById('signup_password').value;
					const confirmPassword = document.getElementById('signup_confirm_password').value;

					if (!fullName || !email || !password || !confirmPassword) {
						showSignupError("Please fill in all required fields.");
						toggleSpinner(false);
						return;
					}
					if (password.length < 6) {
						showSignupError("Password must be at least 6 characters long.");
						toggleSpinner(false);
						return;
					}
					if (password !== confirmPassword) {
						showSignupError("Passwords do not match.");
						toggleSpinner(false);
						return;
					}

					try {
						const userCredential = await auth.createUserWithEmailAndPassword(email, password);
						const user = userCredential.user;

						// Update Firebase Auth user profile with display name
						await user.updateProfile({
							displayName: fullName
						});

						// Create user document in Firestore with all details
						const userRef = db.collection('users').doc(user.uid);
						await userRef.set({
							email: user.email,
							displayName: fullName,
							phone: phone || '', // Store phone, or empty string if not provided
							role: 'viewer',     // Default role for new signups
							createdAt: firebase.firestore.FieldValue.serverTimestamp(),
							lastLogin: firebase.firestore.FieldValue.serverTimestamp() // Set initial lastLogin
						});

						showToast(`Account for ${fullName} (${user.email}) created successfully! Please login.`, 'success', 6000);
						
						// Reset the form and switch back to the login view
						mmdSignupForm.reset();
						if (backToLoginLink) backToLoginLink.click(); // Programmatically click "Back to Login"
						
						// Pre-fill email on login form for convenience
						const loginEmailInput = document.getElementById('login_email');
						if(loginEmailInput) loginEmailInput.value = email;


					} catch (error) {
						// Handle known auth errors more gracefully
						if (error.code === 'auth/email-already-in-use') {
							showSignupError('This email address is already in use. Please try another or login.');
						} else if (error.code === 'auth/weak-password') {
							showSignupError('The password is too weak. Please choose a stronger password.');
						} else {
							showSignupError(error.message); // General Firebase auth errors
						}
						console.error("Signup process error:", error);
					} finally {
						toggleSpinner(false);
					}
				});
			}

			// NEW: Helper function for displaying signup errors
			function showSignupError(message) {
				const signupErrorEl = document.getElementById('signup_error');
				if (signupErrorEl) {
					signupErrorEl.textContent = message;
					signupErrorEl.style.display = 'block';
				} else {
					alert(message); // Fallback if the element isn't found
				}
				console.error("Signup Error:", message);
			}


			function showLoginError(error) {
				const errMsg = error.message || 'Authentication failed. Please check your credentials.';
				const errorEl = document.getElementById('login_error');
				if (errorEl) {
					errorEl.textContent = errMsg;
					errorEl.style.display = 'block';
				} else {
					alert(errMsg); // Fallback
				}
				console.error("Login/Auth Error:", error);
			}

			function toggleSpinner(visible) {
				if (spinner) spinner.style.display = visible ? 'block' : 'none';
			}
	
		
	/////////////////////////////////////////////////////////////////////////////	
     // --- Dashboard Class Definition ---
    class Dashboard {
	DEFAULT_PROFILE_PIC_URL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/4QAiRXhpZgAATU0AKgAAAAgAAQESAAMAAAABAAEAAAAAAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCADIAMgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD6IooopiCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKRmVFLOQqjkknAFAC0Vg3/iBEJS0TzD/fbp+XesafVL2Y/NcOo9EO3+VOwrnb0VwH2ibOfNkz/vGpodSvITlLiT6Mdw/WiwXO5ornbHxDyFvIxj++n9RW/DKk0YeJg6HoRSGPooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigBsjrFGzyMFRRkk9q4/V9UkvpCqkrbg8L6+5q74nvi0gtIz8q8v7nsKwKaQmwooopiCiiigAq5puoS2M25DmM/eQ9D/wDXqnRQB39rcR3MCyxHKN+ntUtcj4evjbXQhc/upTj6N2NddSGgooopDCiiigAooooAKKKKACiiigAooooAKKKKACmTyCGGSRvuopY/hT6zfEL7NKmx1bC/rQByEsjSyvI5yzEk/WmUUVRIUUUUAFFFFABRRRQAV3WmXH2qxhlP3iuG+o4NcLXVeFX3WMiH+GT+YFDBG1RRRUlBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABWV4mGdLPs4rVqjrUXnaXcKOoXd+XP9KAOJoooqiQooooAKKKKACiiigArpvCQ/0e4PbcP5VzNdd4ZiMemBj/AMtHLf0/pQwRrUUUVJQUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUhAIIIyDwaWigDg9QtjaXksJ6KeD6jtVeut8QaebqATRDM0Y6D+IelclVIlhRRRQAUUUUAFFFFAD4YmmmSOMZZzgV3tvEsEEcSfdRQorE8NaeUH2uYYYjEYPYetb9JjQUUUUhhRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAVhazovnM09oAJDyydm9x71u0UAeeujIxV1KsOCCMEU2u7vLG3u1/fxhj2boR+NYdzoUCk+VeKntJj+dVcmxgUVqHRzn/j9s8f9dKs2+hRMR5l7GfaPB/Wi4GEASQAMk10Gj6IzMs16uFHKxnqfr/hWxZaba2mDDGC/99uTVylcdgHA4ooopDCiiigAooooAKKKKACiiigAooooAKKKKACiiorieK2iMk7hEHc0AS1Xury3tVzPKq+g6k/hXPahr0spKWgMSf3j94/4ViszOxZiWY9STkmnYVzo7rxGoyLaEn/ac4/QVmT6zfS/8ttg9EGP/r1nUU7CuSSTSy/6yR3/AN5iajoooAKKKKAHxyyRnMcjof8AZYirsGsX0XSYuPRxn/69Z9FAHR23iMcC5hx/tRn+h/xrYtL63ux+4lVj/d6H8q4SlUlSCpII6EUWC56HRXKafrs0BCXOZo/X+If410trcxXUQkgcMv6j60h3JqKKKQwooooAKKKKACiiigAooqC9uUtLZ5pOi9B6n0oAi1K/isId8nLn7qDqa4+9vJryYyTNn0A6D6U28uZLu4aWU5Y9B2A9BUNUkS2FFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFT2l1LaTCSBirdx2PsagooA7bS9Rjv4sr8sq/eT09/pV6uAtp5LaZZYWw6/rXbafdpe2yypwejL6H0pNDTLNFFFIYUUUUAFFFFABXJeJLwz3nkqf3cXH1bv8A4V1F3MILWWU/wKTXAsSzFmOSTkmmhMSiiimIKKKKACiiigAooooAKKKKACiiigAooooAKKKKACtTw/eG1vQjH91L8p9j2NZdFAHolFV9On+02MMp6soz9e9WKkoKKKKACiiigCpq0ElzYSww43tjqcd65z+wL3/pl/31XXUU7iscj/YF7/0y/wC+qP7Avf8Apl/31XXUUXCxyP8AYF7/ANMv++qP7Avf+mX/AH1XXUUXCxyP9gXv/TL/AL6o/sC9/wCmX/fVddRRcLHI/wBgXv8A0y/76o/sC9/6Zf8AfVddRRcLHI/2Be/9Mv8Avqj+wL3/AKZf99V11FFwscj/AGBe/wDTL/vqj+wL3/pl/wB9V11FFwscj/YF7/0y/wC+qP7Avf8Apl/31XXUUXCxyP8AYF7/ANMv++qP7Avf+mX/AH1XXUUXCxyP9gXv/TL/AL6o/sC9/wCmX/fVddRRcLFHRreW0sVhnxuUnGDnir1FFIYUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAH//2Q==';
		constructor(user, role) {
			if (!user || typeof user.email !== 'string') {
				// ... (error handling) ...
				return;
			}
			this.user = user;
			this.role = role;
			console.log(`Dashboard constructor for ${this.user.email} (Role: ${this.role})`);

			this.members = []; // Will be loaded from Firestore
			this.deletedMembers = []; // Can also be loaded if needed for UI elsewhere
			this.currentEditId = null;
		//	this.householdsForRoute = [];
            this.selectedMemberIds = [];
			this.filteredMembers = [];
			this.currentReminderView = storage.load(REMINDER_VIEW_MODE_STORAGE_KEY, 'card');
			const storedViewMode = storage.load(VIEW_MODE_STORAGE_KEY);
			this.viewMode = storedViewMode || (window.innerWidth <= 768 ? 'card' : 'table');
            this.favorites = storage.load('mmd_favorites', []);
			// Note: init() which builds the UI will be called after data is loaded
		}

		async initializeData() {
            console.log("CCC Dashboard: initializeData START");
			if (!db) {
				showToast("Error: Database service is not available. Cannot load member data.", "error", 10000);
				document.body.innerHTML = "<p style='color:red; text-align:center; font-size:1.2em; padding:20px;'>Critical Error: Database service unavailable. Cannot start app.</p>";
                console.error("CCC Dashboard: initializeData - db not available");
				return false; // Indicate failure
			}
			try {
				toggleSpinner(true); // Show spinner during data load
				const membersSnapshot = await db.collection('members').get();
				this.members = membersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
				console.log(`CCC Dashboard: initializeData - Members data loaded from Firestore: ${this.members.length} members.`); // LOG COUNT
				this.filteredMembers = [...this.members];
				console.log(`CCC Dashboard: initializeData - Initial filteredMembers count: ${this.filteredMembers.length}`); // LOG FILTERED COUNT

                toggleSpinner(false);
                console.log("CCC Dashboard: initializeData SUCCESS");
				return true; // Indicate success
			} catch (error) {
				console.error("CCC Dashboard: initializeData - Error loading initial members data from Firestore:", error);
				showToast("Failed to load essential member data. The application might not work correctly.", "error", 10000);
				document.body.innerHTML = `<p style='color:red; text-align:center; font-size:1.2em; padding:20px;'>Critical Error: Could not load data from database. Details: ${error.message}</p>`;
                toggleSpinner(false);
                console.log("CCC Dashboard: initializeData FAILED");
				return false; // Indicate failure
			}
		}
//////////////////


        getAppContainer() { // Helper for showToast if needed before full init
            return document.getElementById('mmd_container');
        }

        init() {
            console.log("Dashboard.init() called by user:", this.user.email);
            const appContainer = this.getAppContainer(); // Use helper
            if (!appContainer) {
                console.error("#mmd_container not found in DOM for Dashboard.init()!");
                showToast("Fatal Error: Main application container missing.", "error", 10000);
                // If appContainer is null, the rest of init will fail.
                // This should be caught by the !auth check in DOMContentLoaded if firebase failed,
                // or if index.html is missing the div.
                return; 
            }
            // Ensure container is visible (displayAppScreen should have done this)
            appContainer.style.display = 'flex'; // Assuming #mmd_container's default display when visible is flex

            const initialHTML = `
                <div id="mmd_header">
                    <button id="mobile_menu_toggle" aria-label="Toggle menu" aria-expanded="false">☰</button> 
                    <div class="header-center-content"> 
                        <h1>CHIN CHRISTIAN CHURCH</h1>
                        <p><label>"Na bia cu ka kei caah meiin a si, ka lam ah ceunak a si"<br>SALM 119:105</label></p>
                    </div>
                    <button id="theme_toggle" title="Toggle Theme">☀️</button>
                   
                </div>
                <div id="mmd_tabs">
                    <button data-page="home">🏠 Home</button>
                    <button data-page="register" class="${this.role === 'admin' ? '' : 'restricted-feature admin-only'}">📝 Register</button>
                    <button data-page="view">👥 View Members</button>
                    <button data-page="reminders" class="admin-only">🔔 Reminders <span class="badge" id="badge_reminders">0</span></button>
                    <button data-page="importExport" class="admin-only">🔄 Import/Export</button>
                    <button data-page="audit" class="admin-only">📜 Audit Log</button>
                
				<div class="logout-tab-container">
        <button id="logout_btn" class="generic_button_styles danger">🔒 Logout</button>
    </div>
</div>
                <div id="mmd_pages">
                    <div id="page_home" class="mmd_page"></div>
                    <div id="page_register" class="mmd_page ${this.role === 'admin' ? '' : 'restricted-page admin-only'}"></div>
                    <div id="page_view" class="mmd_page"></div>
                    <div id="page_reminders" class="mmd_page admin-only"></div>
                    <div id="page_importExport" class="mmd_page admin-only"></div>
                    <div id="page_audit" class="mmd_page admin-only"></div>
                </div>
                <!-- <div id="mmd_toast_container"></div> -->
`;
            
            setElementHTML(appContainer, initialHTML);
            console.log("Dashboard UI injected into #mmd_container.");

		const logoutBtnEl = document.getElementById('logout_btn');
		if (logoutBtnEl && auth) {
			logoutBtnEl.onclick = () => {
				auth.signOut()
					.then(() => {
						console.log("User signed out.");
						showToast("You have been logged out.", "info");
					})
					.catch((error) => {
						console.error("Logout error:", error);
						showToast("Logout failed. Try again.", "error");
					});
			};
		}


            this.setupThemeToggle(appContainer);
            this.setupMobileMenu(appContainer);
            this.setupTabNavigation(appContainer);
            this.applyRoleRestrictions(appContainer); // Apply restrictions after UI is built

            const homeButton = appContainer.querySelector('#mmd_tabs button[data-page="home"]');
            if (homeButton) {
                // Check if the button is restricted for the current role before clicking
                const isRestricted = homeButton.classList.contains('admin-only') || homeButton.classList.contains('restricted-feature');
                if (!isRestricted || this.role === 'admin') {
                    homeButton.click();
                } else {
                    console.warn("Home button is restricted for current role, cannot click initially.");
                    // Potentially clear page content or show a "no access" message if home is restricted
                    // For now, assume home is always accessible or handled by applyRoleRestrictions redirecting.
                }
            } else { console.error("Home button not found in Dashboard.init after UI injection"); }
            console.log("Dashboard.init() completed.");
        }
/*
				document.querySelectorAll('#mmd_tabs button').forEach(btn => {
					btn.onclick = () => {
						document.querySelectorAll('.mmd_page.active').forEach(p => p.classList.remove('active'));
						document.querySelectorAll('#mmd_tabs button.active').forEach(b => b.classList.remove('active'));
						const pageId = 'page_' + btn.dataset.page;
						const pageElement = document.getElementById(pageId);
						if (pageElement) {
							pageElement.classList.add('active');
						} else {
							console.error(`Page element not found for pageId: ${pageId}. Tab: ${btn.dataset.page}`);
							showToast(`Error: UI component for tab "${btn.dataset.page}" is missing.`, "error");
							return;
						}
						btn.classList.add('active');
						const loadFunctionName = 'load' + btn.dataset.page.charAt(0).toUpperCase() + btn.dataset.page.slice(1);
						if (typeof this[loadFunctionName] === 'function') {
							try { this[loadFunctionName](); } catch (e) {
								console.error(`Error executing ${loadFunctionName} for page ${btn.dataset.page}:`, e);
								showToast(`Error loading tab: ${btn.dataset.page}. Check console.`, "error");
							}
						} else {
							console.error(`Load function not found: ${loadFunctionName} for page ${btn.dataset.page}`);
							showToast(`Error: Action for tab "${btn.dataset.page}" not implemented.`, "error");
						}
					};
				});

        }
*/

        setupThemeToggle(containerContext) {
            const themeToggleBtn = containerContext.querySelector('#theme_toggle');
            if (themeToggleBtn) {
                const savedTheme = storage.load(THEME_STORAGE_KEY, 'light');
                document.documentElement.classList.toggle('dark', savedTheme === 'dark');
                themeToggleBtn.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
                themeToggleBtn.addEventListener('click', () => {
                    const isDark = document.documentElement.classList.toggle('dark');
                    const theme = isDark ? 'dark' : 'light';
                    storage.save(THEME_STORAGE_KEY, theme);
                    themeToggleBtn.textContent = isDark ? '🌙' : '☀️';
                    if (this.isPageActive('home')) this.loadHome(); // Assuming isPageActive helper
                });
            }
        }
        isPageActive(pageName) { // Helper
            const pageEl = document.getElementById('page_' + pageName);
            return pageEl && pageEl.classList.contains('active');
        }

        setupMobileMenu(containerContext) {
            const mobileMenuToggleBtn = containerContext.querySelector('#mobile_menu_toggle');
            const tabsContainer = containerContext.querySelector('#mmd_tabs');
            if (mobileMenuToggleBtn && tabsContainer) {
                mobileMenuToggleBtn.addEventListener('click', function(event) {
                    event.stopPropagation();
                    tabsContainer.classList.toggle('mmd_tabs_visible_mobile');
                    const isNowVisible = tabsContainer.classList.contains('mmd_tabs_visible_mobile');
                    this.setAttribute('aria-expanded', isNowVisible);
                    this.innerHTML = isNowVisible ? '&times;' : '☰';
                });
                const tabButtons = tabsContainer.querySelectorAll('button[data-page]');
                tabButtons.forEach(tabButton => {
                    tabButton.addEventListener('click', () => {
                        if (window.getComputedStyle(mobileMenuToggleBtn).display !== 'none' && tabsContainer.classList.contains('mmd_tabs_visible_mobile')) {
                            tabsContainer.classList.remove('mmd_tabs_visible_mobile');
                            mobileMenuToggleBtn.setAttribute('aria-expanded', 'false');
                            mobileMenuToggleBtn.innerHTML = '☰';
                        }
                    });
                });
            }
        }

        setupTabNavigation(containerContext) {
            containerContext.querySelectorAll('#mmd_tabs button[data-page]').forEach(btn => {
                const pageKey = btn.dataset.page;
                const isRestricted = btn.classList.contains('admin-only') || btn.classList.contains('restricted-feature');
                
                if (isRestricted && this.role !== 'admin') {
                    btn.disabled = true;
                    btn.style.opacity = '0.6';
                    btn.style.pointerEvents = 'none';
                    btn.title = "Admin access required";
                    // Ensure if a restricted page is somehow active, we navigate away
                    const pageElement = containerContext.querySelector(`#page_${pageKey}`);
                    if (pageElement && pageElement.classList.contains('active')) {
                        containerContext.querySelector('#mmd_tabs button[data-page="home"]')?.click();
                    }
                    return; // Skip attaching normal navigation
                }

                btn.onclick = () => {
                    containerContext.querySelectorAll('.mmd_page.active').forEach(p => p.classList.remove('active'));
                    containerContext.querySelectorAll('#mmd_tabs button.active').forEach(b => b.classList.remove('active'));
                    
                    const pageId = 'page_' + pageKey;
                    const pageElementToActivate = containerContext.querySelector(`#${pageId}`);
                    if (pageElementToActivate) {
                        pageElementToActivate.classList.add('active');
                    } else {
                        console.error(`Page element not found for pageId: ${pageId}. Tab: ${pageKey}`);
                        showToast(`Error: UI component for tab "${pageKey}" is missing.`, "error");
                        return;
                    }

                    // Add active class to desktop tabs only if mobile menu isn't visible
                    if (window.getComputedStyle(containerContext.querySelector('#mobile_menu_toggle')).display === 'none') {
                        btn.classList.add('active');
                    }
                    
                    const loadFunctionName = 'load' + pageKey.charAt(0).toUpperCase() + pageKey.slice(1);
                    if (typeof this[loadFunctionName] === 'function') {
                        try { this[loadFunctionName](); } catch (e) { console.error(`Error loading ${loadFunctionName}`, e); }
                    } else { console.warn(`Load function ${loadFunctionName} not found.`); }
                };
            });
        }
        
         applyRoleRestrictions(containerContext = document.getElementById('mmd_container')) {
            if (!containerContext || !this.role) return;
            console.log(`Applying role restrictions for role: ${this.role} within`, containerContext);
            
            const isAdmin = this.role === 'admin';

            containerContext.querySelectorAll('.admin-only, .restricted-feature, .restricted-page').forEach(el => {
                if (isAdmin) {
                    el.style.display = ''; // Or original display value
                    el.disabled = false;
                    el.style.opacity = '';
                    el.style.pointerEvents = '';
                    el.title = '';
                } else {
                    if (el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
                        el.disabled = true;
                        el.style.opacity = '0.5';
                        el.style.pointerEvents = 'none';
                        el.title = "Admin access required";
                    } else { // For page divs or other elements
                        el.style.display = 'none';
                    }
                }
            });

            // If a restricted page is somehow active for a non-admin, navigate to home
            if (!isAdmin) {
                const activeRestrictedPage = containerContext.querySelector('.mmd_page.admin-only.active, .mmd_page.restricted-page.active');
                if (activeRestrictedPage) {
                    console.log("Active page is restricted for current user, navigating to home.");
                    const homeButton = containerContext.querySelector('#mmd_tabs button[data-page="home"]');
                    if (homeButton) homeButton.click();
                }
            }
        }	
	
	


			_showRoleMembersModal(role) {
				const roleMembers = this.members.filter(m => m.position === role);
				let listHTML = "<ul>";
				if (roleMembers.length > 0) {
					roleMembers.forEach(m => {
						listHTML += `<li><strong>${m.fullName}</strong><br>
							${m.phone ? `📞 <a href="tel:${m.phone}" class="contact-link">${m.phone}</a><br>` : ''}
							${m.email ? `✉️ <a href="mailto:${m.email}" class="contact-link">${m.email}</a><br>` : ''}
							${m.addr ? `📍 <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.addr)}" target="_blank" rel="noopener noreferrer" class="map-link contact-link">${m.addr}</a>` : 'Address N/A'}
						</li>`;
					});
				} else { listHTML += `<li>No members found with the role of ${role}.</li>`; }
				listHTML += "</ul>";
				showModal(`${role} List (${roleMembers.length})`, listHTML);
			}

		_showHomeGroupDetailsModal(groupName = null, currentFilterMinAge = null, currentFilterMaxAge = null) {
		const baseTitle = groupName ? `Home Group: ${groupName} - Stats` : "All Home Groups - Aggregated Stats";
		
		// Function to generate the body HTML for the stats popup
		// This will be called initially and when filters are applied
		const generateStatsContentHTML = (filterMinAge, filterMaxAge) => {
		let membersInScope = this.members; // Members of the selected group, or all members
		if (groupName) { // groupName is from the outer scope of _showHomeGroupDetailsModal
			membersInScope = this.members.filter(m => (m.homeGroup || 'Unknown') === groupName);
		}

		// --- Original Stats Calculation (for the main display - REMAINS UNCHANGED by age filter) ---
		const originalTotalMembers = membersInScope.length;
		const originalHouseholds = new Set(membersInScope.map(mem => mem.householdId || mem.id).filter(Boolean)).size;
		const originalGenderCounts = membersInScope.reduce((acc, m) => { acc[m.gender || 'Unknown'] = (acc[m.gender || 'Unknown'] || 0) + 1; return acc; }, {});
		const originalGenderHTML = Object.entries(originalGenderCounts).map(([g, c]) => `${g}: ${c}`).join('<br>') || "N/A";
		
		const originalAgeBuckets = { '0–18':0, '19–35':0, '36–50':0, '51–65':0, '66+':0, 'Unknown':0 };
		membersInScope.forEach(m => {
			const a = dateUtils.age(m.dob);
			if (isNaN(a)) originalAgeBuckets['Unknown']++;
			else if (a <= 18) originalAgeBuckets['0–18']++;
			else if (a <= 35) originalAgeBuckets['19–35']++;
			else if (a <= 50) originalAgeBuckets['36–50']++;
			else if (a <= 65) originalAgeBuckets['51–65']++;
			else originalAgeBuckets['66+']++;
		});
		const originalAgeSummaryHTML = Object.entries(originalAgeBuckets).map(([range, cnt]) => `${range}: ${cnt}`).join('<br>');

		// --- NEW: Age Filter Specific Stats Calculation ---
		let ageFilteredTotal = 0;
		let ageFilteredMales = 0;
		let ageFilteredFemales = 0;
		let ageFilteredOtherGender = 0; // If you track "Other" gender
		let ageFilterApplied = false;
		let currentAgeFilterNoteHTML = ""; // For the main filter note

		const minAgeInt = filterMinAge !== null && filterMinAge !== '' ? parseInt(filterMinAge) : null;
		const maxAgeInt = filterMaxAge !== null && filterMaxAge !== '' ? parseInt(filterMaxAge) : null;

		if ((minAgeInt !== null && !isNaN(minAgeInt)) || (maxAgeInt !== null && !isNaN(maxAgeInt))) {
			ageFilterApplied = true;
			let tempFilteredMembers = membersInScope.filter(m => {
				const age = dateUtils.age(m.dob);
				if (isNaN(age)) return false;
				let matches = true;
				if (minAgeInt !== null && age < minAgeInt) matches = false;
				if (maxAgeInt !== null && age > maxAgeInt) matches = false;
				return matches;
			});
			
			ageFilteredTotal = tempFilteredMembers.length;
			tempFilteredMembers.forEach(m => {
				if (m.gender === 'Male') ageFilteredMales++;
				else if (m.gender === 'Female') ageFilteredFemales++;
				else if (m.gender === 'Other') ageFilteredOtherGender++; // Adjust if needed
			});
			currentAgeFilterNoteHTML = `<p><i>Age filter (${minAgeInt !== null ? minAgeInt : 'any'} to ${maxAgeInt !== null ? maxAgeInt : 'any'}) applied below.</i></p>`;
		}


		// --- HTML Structure ---
		// The original stats sections now use the "original" prefixed variables
		const originalStatsDataHTML = `
		  <div class="details-grid">
			<div><h4>Overall</h4>Total Members: ${originalTotalMembers}<br>Households: ${originalHouseholds}</div>
			<div><h4>By Gender</h4>${originalGenderHTML}</div>
			<div><h4>By Age Range (Summary)</h4>${originalAgeSummaryHTML}</div>
		  </div>
		  ${membersInScope.length === 0 && groupName ? `<p class="info-message">No members found in group: ${groupName}.</p>` : ''}
		`;
		
		// NEW HTML for the age-filtered results section
		const ageFilterResultsHTML = ageFilterApplied ? `
		  <div class="details-grid-item age-filter-results"> 
			<h4>Filtered by Age (${minAgeInt !== null ? minAgeInt : 'any'} - ${maxAgeInt !== null ? maxAgeInt : 'any'})</h4>
			<p>Total Matching: ${ageFilteredTotal}</p>
			<p>Males: ${ageFilteredMales}</p>
			<p>Females: ${ageFilteredFemales}</p>
			${ageFilteredOtherGender > 0 ? `<p>Other: ${ageFilteredOtherGender}</p>` : ''}
		  </div>
		` : `
		  <div class="details-grid-item age-filter-results">
			<p style="font-style: italic; color: var(--sec);">Enter age range and apply filter to see specific counts here.</p>
		  </div>
		`;

		// Combine into the full body HTML
		return `
			<div class="modal-date-filter">
				<h4>Filter by Age Range:</h4>
				<label>Min Age: <input type="number" id="group_stats_min_age" value="${filterMinAge === null ? '' : filterMinAge}" style="width:70px;"></label>
				<label>Max Age: <input type="number" id="group_stats_max_age" value="${filterMaxAge === null ? '' : filterMaxAge}" style="width:70px;"></label>
				<button id="apply_group_stats_age_filter_btn" class="generic_button_styles">Apply Filter</button>
			</div>
			<div id="age_filter_note_container">${currentAgeFilterNoteHTML}</div>
			
			
			<div class="stats-columns-container">
				<div class="stats-column original-stats">
					${originalStatsDataHTML}
				</div>
				<div class="stats-column age-filtered-stats-target"> 
					${ageFilterResultsHTML}
				</div>
			</div>
		`;
	};

		// Initial content for the popup
		let popupBodyContent = generateStatsContentHTML(currentFilterMinAge, currentFilterMaxAge);

		// Callback function for when the filter is applied inside the popup
		const handleFilterApply = (newMinAge, newMaxAge) => {
			// Regenerate the ENTIRE body content with new filters
			const newPopupBodyContent = generateStatsContentHTML(newMinAge, newMaxAge);
			const popupBodyElement = document.querySelector('#stats_popup_body'); // Get the body of the currently open stats popup

			if (popupBodyElement) {
				setElementHTML(popupBodyElement, newPopupBodyContent); // Update the entire body of the popup

				// Re-attach event listener for the apply button inside the new content
				const applyFilterBtn = popupBodyElement.querySelector('#apply_group_stats_age_filter_btn');
				if (applyFilterBtn) {
					applyFilterBtn.onclick = () => {
						const minAgeInput = popupBodyElement.querySelector('#group_stats_min_age');
						const maxAgeInput = popupBodyElement.querySelector('#group_stats_max_age');
						// Pass the current values back to handleFilterApply to preserve them if one is empty
						const newerMinAge = minAgeInput ? minAgeInput.value : null;
						const newerMaxAge = maxAgeInput ? maxAgeInput.value : null;
						handleFilterApply(newerMinAge, newerMaxAge); 
					};
				}
			}
			// Update the main popup title if you want to indicate filtering
			const popupTitleEl = document.querySelector('#stats_popup_header h2');
			if (popupTitleEl) {
				let title = groupName ? `Home Group: ${groupName} - Stats` : "All Home Groups - Aggregated Stats";
				if ((newMinAge !== null && newMinAge !== '') || (newMaxAge !== null && newMaxAge !== '')) {
					title += ` (Age Filter Applied)`;
				}
				popupTitleEl.textContent = title;
			}
		};

		// Show the new dedicated stats popup
		showStatsPopup(
			groupName ? `Home Group: ${groupName} - Stats` : "All Home Groups - Aggregated Stats", 
			popupBodyContent, 
			handleFilterApply // Pass the callback, but it's now handled internally by re-attaching
		);

		// The applyFilterBtn listener is now set up *inside* handleFilterApply after content is set
		// So the initial call to showStatsPopup doesn't need to wire it up directly if handleFilterApply is called once.
		// Or, to be safe, ensure the first apply button gets its listener too:
		const initialApplyBtn = document.querySelector('#stats_popup_body #apply_group_stats_age_filter_btn');
		if (initialApplyBtn) {
			initialApplyBtn.onclick = () => {
				const minAgeInput = document.querySelector('#stats_popup_body #group_stats_min_age');
				const maxAgeInput = document.querySelector('#stats_popup_body #group_stats_max_age');
				const newerMinAge = minAgeInput ? minAgeInput.value : null;
				const newerMaxAge = maxAgeInput ? maxAgeInput.value : null;
				handleFilterApply(newerMinAge, newerMaxAge);
			};
		}
		}
////////////////////////////////////
			
loadView() {
			console.log("CCC Dashboard: Restoring full loadView structure.");
			const pageEl = document.getElementById('page_view');
			if (!pageEl) {
				showToast("Error: View page UI component missing.", "error");
                console.error("CCC Dashboard: #page_view missing in loadView.");
				return;
			}

            // Construct the full HTML for the view page, ensuring #view_content is definitely there
            const fullViewHTML = `
              <div id="member_view_controls">
                <input type="search" id="member_search_input" placeholder="Search..." style="min-width:250px; flex-basis: 300px; margin-bottom:5px;">
                <fieldset class="filter-group">
                  <legend>Home Group</legend>
                  <select id="member_filter_group"><option value="">All</option><option>A</option><option>B</option><option>C</option><option>D</option><option>Unknown</option></select>
                </fieldset>
                <fieldset class="filter-group">
                  <legend>Position</legend>
                  <select id="member_filter_position"><option value="">All</option><option>Member</option><option>Pastor</option><option>Deacon</option></select>
                </fieldset>
                <fieldset class="filter-group">
                  <legend>Gender</legend>
                  <select id="member_filter_gender"><option value="">All</option><option>Male</option><option>Female</option><option>Other</option></select>
                </fieldset>
                <fieldset class="filter-group">
                  <legend>Marital Status</legend>
                  <select id="member_filter_marital"><option value="">All</option><option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option><option>Other</option></select>
                </fieldset>
                <button id="clear_member_filters_btn" class="generic_button_styles" style="padding:8px 12px; align-self:flex-end;">Clear Filters</button>
                <button id="show_favorites_btn" class="generic_button_styles" style="padding:8px 12px; align-self:flex-end; background-color: #ffc107; color: #333;">
                    ⭐ Show Favorites (<span id="fav_count">0</span>)
                </button>
              </div>

              <div id="route_planner_dynamic_bar" style="
                    display: none;
                    position: sticky;
                    top: 0;

                    padding: 10px;
                    z-index: 999;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                    text-align: center;
                    border-bottom: 1px solid var(--sec);
                ">
                <span style="margin-right:15px; color: var(--fg); font-weight:bold;">
                    Selected: <span id="dynamic_selected_count">0</span>
                </span>
                <div class="dynamic-button-group">
                    <button id="btn_dynamic_generate_route" class="generic_button_styles" disabled>Plan Route</button>
                    <button id="btn_dynamic_add_favorites" class="generic_button_styles" style="background-color: #ffc107; color: #333;" disabled>
                        ⭐ Add to Favorites
                    </button>
                    <button id="btn_dynamic_clear_route" class="generic_button_styles danger">Clear Selection</button>
                </div>
              </div>

              <button id="toggle_view" class="generic_button_styles" style="margin-bottom: 15px; margin-top:10px;">Toggle View</button>
              
              <div id="view_content">
                </div>
            `;
			setElementHTML(pageEl, fullViewHTML);
            console.log("CCC Dashboard: Full view HTML (from tpl.view structure) set in loadView.");

            // Re-attach ALL listeners for the controls that are now part of fullViewHTML
            // This is crucial because we've just replaced the DOM content of #page_view

            // Toggle View Button
			const toggleViewBtn = document.getElementById('toggle_view');
			if (toggleViewBtn) {
				toggleViewBtn.textContent = this.viewMode === 'card' ? 'Switch to Table View' : 'Switch to Card View';
				toggleViewBtn.onclick = () => {
					this.viewMode = (this.viewMode === 'card' ? 'table' : 'card');
					storage.save(VIEW_MODE_STORAGE_KEY, this.viewMode);
					toggleViewBtn.textContent = this.viewMode === 'card' ? 'Switch to Table View' : 'Switch to Card View';
					this.renderViewContent(); // Re-render with new view mode
				};
			}

			// Search and Filter Listeners
			const searchInput = document.getElementById('member_search_input');
			const groupFilterSelect = document.getElementById('member_filter_group');
			const positionFilterSelect = document.getElementById('member_filter_position');
			const genderFilterSelect = document.getElementById('member_filter_gender');
			const maritalFilterSelect = document.getElementById('member_filter_marital');
			const clearFiltersBtn = document.getElementById('clear_member_filters_btn');
            const showFavoritesBtn = document.getElementById('show_favorites_btn');

			if (searchInput) searchInput.addEventListener('input', () => this.applyFiltersAndSearch());
			if (groupFilterSelect) groupFilterSelect.addEventListener('change', () => this.applyFiltersAndSearch());
			if (positionFilterSelect) positionFilterSelect.addEventListener('change', () => this.applyFiltersAndSearch());
			if (genderFilterSelect) genderFilterSelect.addEventListener('change', () => this.applyFiltersAndSearch());
			if (maritalFilterSelect) maritalFilterSelect.addEventListener('change', () => this.applyFiltersAndSearch());
			
            if (clearFiltersBtn) {
				clearFiltersBtn.addEventListener('click', () => {
					if (searchInput) searchInput.value = '';
					if (groupFilterSelect) groupFilterSelect.value = '';
					if (positionFilterSelect) positionFilterSelect.value = '';
					if (genderFilterSelect) genderFilterSelect.value = '';
					if (maritalFilterSelect) maritalFilterSelect.value = '';
					this.applyFiltersAndSearch();
				});
			}
            if (showFavoritesBtn) {
                showFavoritesBtn.addEventListener('click', () => this._showFavoritesModal());
            }

            // Dynamic Bar Button Listeners
            const dynamicGenerateBtn = document.getElementById('btn_dynamic_generate_route');
            const dynamicAddFavoritesBtn = document.getElementById('btn_dynamic_add_favorites');
            const dynamicClearBtn = document.getElementById('btn_dynamic_clear_route');

			if (dynamicGenerateBtn) {
				dynamicGenerateBtn.onclick = () => {
                    // ... (Keep the logic from the previous response for this button) ...
                    // This is the version for individual member selection:
                    const selectedMembers = this.members.filter(m => this.selectedMemberIds.includes(m.id));
					const processedAddresses = selectedMembers.map(m => {
						if (!m.address || typeof m.address !== 'string' || m.address.trim() === '') return null;
						return m.address.trim().replace(/^\/+/, '');
					}).filter(Boolean);

					if (processedAddresses.length === 0) { /* ... error handling ... */ return; }
                    if (processedAddresses.length < 2) { /* ... error handling ... */ return; }
					if (processedAddresses.length > 25) { /* ... warning ... */ }

					const initialPromptHTML = this.generateGoogleMapsRouteLink(true);
					if (!initialPromptHTML) { /* ... error handling ... */ return; }

					const modal = showModal(
						"Plan Route - Final Destination", initialPromptHTML,
						[ { label: "Open in Google Maps", className: "generic_button_styles primary-action",
								action: (modalInstance, modalContentScope) => {
									const finalStopInput = modalContentScope.querySelector('#final_stop_input');
									const userInputFinalDestination = finalStopInput ? finalStopInput.value : "";
									this._constructAndDisplayFinalRoute(userInputFinalDestination, processedAddresses, modalInstance );
								}
							},
							{ label: "Cancel", action: modalInstance => modalInstance.remove() }
						],'modal-route-prompt');
                    const input = modal.querySelector('#final_stop_input');
                    if(input) {
                        input.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                const userInputFinalDestination = input.value || "";
                                this._constructAndDisplayFinalRoute(userInputFinalDestination, processedAddresses, modal);
                            }
                        });
                    }
				};
			}
            if (dynamicAddFavoritesBtn) {
                dynamicAddFavoritesBtn.onclick = () => this._addSelectedToFavorites();
            }
			if (dynamicClearBtn) {
				dynamicClearBtn.onclick = () => {
					this.selectedMemberIds = [];
					this.updateDynamicRouteBar();
					this.renderViewContent(); // Re-render to uncheck boxes
					showToast("Selection cleared.", "info");
				};
			}

            // Initial setup calls
            this._updateFavoritesCount();
			this.updateDynamicRouteBar();
			this.applyFiltersAndSearch(); // This will call the full renderViewContent
		}

///////////////////////////
        _updateFavoritesCount() {
            const countEl = document.getElementById('fav_count');
            if (countEl) {
                countEl.textContent = this.favorites.length;
            }
        }

         _addSelectedToFavorites() {
            if (this.selectedMemberIds.length === 0) { // <<< Use selectedMemberIds
                showToast("Please select members first.", "info");
                return;
            }

            let addedCount = 0;
            this.selectedMemberIds.forEach(memberId => { // <<< Use selectedMemberIds
                if (!this.favorites.includes(memberId)) {
                    this.favorites.push(memberId);
                    addedCount++;
                }
            });

            if (addedCount > 0) {
                storage.save('mmd_favorites', this.favorites);
                this._updateFavoritesCount();
                showToast(`${addedCount} member(s) added to favorites.`, "success");
            } else {
                showToast("Selected members are already in favorites.", "info");
            }

            // Clear the selection after adding
            this.selectedMemberIds = []; // <<< Use selectedMemberIds
            this.updateDynamicRouteBar();
            this.renderViewContent();
        }

        _removeFavorite(memberId) {
            this.favorites = this.favorites.filter(id => id !== memberId);
            storage.save('mmd_favorites', this.favorites);
            this._updateFavoritesCount();
            this._showFavoritesModal(); // Refresh the modal to show the change
            showToast("Removed from favorites.", "info");
        }

		_showFavoritesModal() {
            const favoriteMembers = this.members.filter(m => this.favorites.includes(m.id));
            let contentHTML = '<h4>Your Favorite Members</h4>';

            if (favoriteMembers.length === 0) {
                contentHTML += '<p>You have no favorite members yet.</p>';
            } else {
                contentHTML += '<ul style="list-style: none; padding: 0; max-height: 60vh; overflow-y: auto;">';
                favoriteMembers.forEach(m => {
                    contentHTML += `
                        <li style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; border-bottom: 1px solid var(--sec); padding-bottom: 10px;">
                            <img src="${m.profilePictureUrl || this.DEFAULT_PROFILE_PIC_URL}" alt="${m.fullName}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover;">
                            <div style="flex-grow: 1;">
                                <strong>${m.fullName}</strong><br>
                                <span style="font-size: 0.85em;">📞 ${m.phone || 'N/A'} |<br> 📍 ${m.address || 'N/A'}</span>
                            </div>
                            <button class="btn_remove_fav generic_button_styles danger" data-id="${m.id}" style="padding: 4px 8px; font-size: 0.75rem;">Remove</button>
                        </li>`;
                });
                contentHTML += '</ul>';
            }

            const modal = showModal("Favorites", contentHTML, [{ label: "Close", action: (modal) => modal.remove() }]);

            // Add listeners to remove buttons inside the newly created modal
            modal.querySelectorAll('.btn_remove_fav').forEach(btn => {
                btn.onclick = (e) => {
                    // Prevent the modal from closing if the button action handles it
                    e.stopPropagation();
                    this._removeFavorite(e.target.dataset.id);
                };
            });
        }

	// --- NEW METHOD: Update Dynamic Route Planner Bar ---
	updateDynamicRouteBar() {
		const dynamicRouteBar = document.getElementById('route_planner_dynamic_bar');
		const dynamicSelectedCountEl = document.getElementById('dynamic_selected_count');
		const dynamicGenerateBtn = document.getElementById('btn_dynamic_generate_route');
        const dynamicAddFavoritesBtn = document.getElementById('btn_dynamic_add_favorites');

		if (!dynamicRouteBar || !dynamicSelectedCountEl || !dynamicGenerateBtn || !dynamicAddFavoritesBtn) {
			return;
		}

		const selectedCount = this.selectedMemberIds.length; 
		dynamicSelectedCountEl.textContent = selectedCount;

		if (selectedCount > 0) {
			dynamicRouteBar.style.display = 'block';
		} else {
			dynamicRouteBar.style.display = 'none';
		}
		dynamicGenerateBtn.disabled = selectedCount < 2; // Route needs at least 2
        dynamicAddFavoritesBtn.disabled = selectedCount < 1; // Favorites needs at least 1
	}
		  

        toggleMemberSelection(memberId, isChecked) {
            console.log("Toggling member selection:", { memberId, isChecked });

            if (isChecked) {
                // Add member ID if it's not already there
                if (!this.selectedMemberIds.includes(memberId)) {
                    this.selectedMemberIds.push(memberId);
                }
            } else {
                // Remove member ID
                this.selectedMemberIds = this.selectedMemberIds.filter(id => id !== memberId);
            }
            // Update the dynamic bar (count and button states)
            this.updateDynamicRouteBar();
        }

	updateRoutePlannerSelectionDisplay() {
		const countEl = document.getElementById('selected_household_count');
		const listEl = document.getElementById('selected_households_for_route');
		const generateBtn = document.getElementById('btn_generate_route_link');
		const placeholderEl = document.getElementById('route_selection_placeholder');

		if (countEl) countEl.textContent = this.householdsForRoute.length;
		if (listEl) {
			setElementHTML(listEl, ''); // Clear previous list items
			if (this.householdsForRoute.length > 0) {
				this.householdsForRoute.forEach((hh, index) => {
					const li = document.createElement('li');
					li.textContent = `${hh.name} - ${decodeURIComponent(hh.address)}`;
					listEl.appendChild(li);
				});
				if (placeholderEl) placeholderEl.style.display = 'none';
			} else {
				if (placeholderEl) placeholderEl.style.display = 'block';
			}
		}
		if (generateBtn) {
			generateBtn.disabled = this.householdsForRoute.length < 2;
		}
	}
	//////////////////////////////////////////////////////////////////////////////////////////////
	 

	generateGoogleMapsRouteLink(forModal = true) {
        // We no longer need to calculate addresses here, just return the HTML.
        // We removed the checks, as they are now done before calling this.

		const promptHTML = `
	        <div id="route_destination_prompt_content">
		        <label style="font-size:1em; font-weight:bold;">A donghnak na kalduhnak address:</label><br>
		        <input id="final_stop_input" type="text" placeholder="e.g., Nan inn address si lo le a hnubik na kalduhnak"
			           style="width:100%; padding:8px; margin-bottom:10px; box-sizing:border-box;">
		        <p style="font-size:0.8em; color:var(--fg-muted); margin-bottom:15px;">
		          A donghnak ah inn ah ṭin an duh a si ahcun nan inn address ka hin ṭial, zeihmanh na ṭial lo ahcun biakinn ah an kir pi lai
		        </p>
	        </div>
	        <div id="final_route_output_area" style="margin-top:15px;"></div>
	    `;

		if (forModal) {
			return promptHTML; // Return the HTML for the modal
		} else {
			// This 'else' part is likely not used now, but kept for safety.
			const outputDiv = document.getElementById('route_link_output_on_some_page');
			if (outputDiv) setElementHTML(outputDiv, promptHTML);
			return null;
		}
	}

	_constructAndDisplayFinalRoute(userInputFinalDestination, processedWaypoints, modalInstance) {
	  const fallbackHomeAddress = "201 E Epler Ave, Indianapolis, IN 46227";
	  let finalDestinationAddress = userInputFinalDestination.trim() || fallbackHomeAddress;
	  finalDestinationAddress = finalDestinationAddress.replace(/^\/+/, '');

	  if (!finalDestinationAddress || finalDestinationAddress.length === 0) {
		showToast("Final destination address is invalid.", "error");
		return;
	  }

	  const lowerFinalDest = finalDestinationAddress.toLowerCase();
	  const waypointsForUrl = processedWaypoints
		.filter(addr => addr.toLowerCase() !== lowerFinalDest)
		.map(addr => encodeURIComponent(addr));

	  let mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=${encodeURIComponent(finalDestinationAddress)}`;
	  if (waypointsForUrl.length > 0) {
		mapsUrl += `&waypoints=${waypointsForUrl.join('|')}`;
	  }

	  const newWindow = window.open(mapsUrl, '_blank', 'noopener,noreferrer');

	if (!newWindow) {
		showToast("Popup blocked. Please copy the URL manually.", "error", 7000);
	  } else {
		// ✅ Auto-close the modal
		if (modalInstance) {
		if (typeof modalInstance.remove === 'function') {
			modalInstance.remove(); // your current setup
		} else if (typeof modalInstance.close === 'function') {
			modalInstance.close(); // try this fallback
		} else if (modalInstance.classList.contains('mmd_modal')) {
			modalInstance.style.display = 'none'; // fallback hide
		}
	} else {
		  console.warn("Modal instance not passed correctly.");
		}
	  }
	}

/*	updateViewMemberCheckboxes() {
		// This function is called by renderViewContent or when clearing selection
		document.querySelectorAll('.route-select-checkbox').forEach(cb => {
			const memberId = cb.dataset.memberId;
			const householdId = cb.dataset.householdId;
			const uniqueKey = householdId || memberId;
			cb.checked = this.householdsForRoute.some(hh => (hh.householdId || hh.id) === uniqueKey);
		});
	}
*/

	///////////////////////////////////////////////////

			loadHome() {
				console.log("CCC Dashboard Web App v4.4.5: loadHome() started.");
				const pageEl = document.getElementById('page_home');
				if (!pageEl) { /* ... */ return; }
				setElementHTML(pageEl, tpl.home);

				const members = this.members;
				document.getElementById('cnt_members').textContent = members.length;
				document.getElementById('cnt_households').textContent = new Set(members.map(mem => mem.householdId || mem.id).filter(Boolean)).size;
				
				const pastorCountEl = document.getElementById('cnt_pastors');
				pastorCountEl.textContent = members.filter(m => m.position === 'Pastor').length;
				pastorCountEl.onclick = () => this._showRoleMembersModal('Pastor');

				const deaconCountEl = document.getElementById('cnt_deacons');
				deaconCountEl.textContent = members.filter(m => m.position === 'Deacon').length;
				deaconCountEl.onclick = () => this._showRoleMembersModal('Deacon');
				
				const mapDiv = document.getElementById('map_home');
				if (mapDiv && window.L) { // Check if Leaflet is available
					mapDiv.style.height = '220px'; // Ensure map div has height
					try {
						if (this._homeMapInstance) {
							this._homeMapInstance.remove(); // Remove previous instance if any
						}
						 const churchAddress = "201 E Epler Ave, Indianapolis, IN 46227";
						// Simple static image fallback for now as geocoding is not implemented
						 mapDiv.innerHTML = `
							<img src="https://firebasestorage.googleapis.com/v0/b/cccmembershipca.firebasestorage.app/o/CCC%20Banner.png?alt=media&token=10cfcc2d-85b5-4b60-8302-baf6278ac0be" 
								 alt="CCC Location" style="width:auto; height:100%; object-fit:fill; border-radius:8px;position:absolute; bottom:20px; width:100%;">
							<div style="padding:8px; text-align:center; background:var(--bg); position:absolute; bottom:0; width:100%; box-sizing:border-box;">
								 <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(churchAddress)}"
									target="_blank" class="map-link" style="font-size:1rem; color:var(--primary); text-decoration:none;">
								   <span style="font-size:1.2em; vertical-align:middle;">📍</span>
								   <span style="vertical-align:middle; margin-left:4px;">${churchAddress}</span>
								 </a>
							</div>`;
						mapDiv.style.position = 'relative'; // For absolute positioning of the link

						// To make it interactive with Leaflet (requires geocoding or known lat/lng):
						// Example: const latLng = [39.6897, -86.1520]; // Approx. for E Epler Ave
						// this._homeMapInstance = L.map('map_home').setView(latLng, 15);
						// L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
						//     attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
						// }).addTo(this._homeMapInstance);
						// L.marker(latLng).addTo(this._homeMapInstance).bindPopup("Chin Christian Church").openPopup();
						
					} catch(e) {
						console.error("Error initializing map:", e);
						mapDiv.innerHTML = "<p>Map could not be loaded.</p>";
					}
				} else if (mapDiv) {
					 mapDiv.innerHTML = "<p>Map library (Leaflet) not loaded.</p>";
				}


				if (window.Chart && window.ChartDataLabels) {
					const createChartOptions = (chartType, specificPluginOptions = {}) => { /* ... same as before ... */ 
						const fgColor = getComputedStyle(document.documentElement).getPropertyValue('--fg').trim() || '#333';
						const secColor = getComputedStyle(document.documentElement).getPropertyValue('--sec').trim() || '#ccc';
						let options = {
							responsive: true, maintainAspectRatio: true,
							aspectRatio: (chartType === 'pie' || chartType === 'doughnut') ? 1 : 1,
							plugins: {
								legend: { position: 'bottom', labels: { color: fgColor } },
								datalabels: {
									color: (chartType === 'pie' || chartType === 'doughnut') ? '#fff' : fgColor,
									
									anchor: (chartType === 'pie' || chartType === 'doughnut') ? 'center' : 'end',
									align: (chartType === 'pie' || chartType === 'doughnut') ? 'center' : 'top',
									formatter: (value, context) => {
										if (chartType === 'pie' || chartType === 'doughnut') {
											if (context.chart.data.labels && context.dataIndex < context.chart.data.labels.length) {
												const label = context.chart.data.labels[context.dataIndex];
												return value > 0 ? `${label}\n(${value})` : null;
											}
											return value > 0 ? `(${value})` : null;
										}
										return value > 0 ? value : null;
									},
									font: { weight: 'bold', size: (chartType === 'pie' || chartType === 'doughnut') ? 10 : 12 },
									display: (context) => context.dataset.data[context.dataIndex] > 0,
									...( (chartType === 'pie' || chartType === 'doughnut') && {
										textStrokeColor: 'black', textStrokeWidth: 0.5,
										backgroundColor: (ctx) => {
											const dsBgColor = ctx.dataset.backgroundColor;
											if (Array.isArray(dsBgColor)) {
												return (ctx.dataIndex < dsBgColor.length) ? dsBgColor[ctx.dataIndex] : '#000';
											}
											return dsBgColor || '#000';
										},
										borderRadius: 4, padding:3
									})
								}, ...specificPluginOptions
							}
						};
						if (['bar', 'line'].includes(chartType)) {
							options.scales = {
								x: { display: true, ticks: { color: fgColor }, grid: { color: secColor } },
								y: { display: true, ticks: { color: fgColor }, grid: { color: secColor }, beginAtZero: true }
							};
						} else { delete options.scales; }
						return options;
					};
					const homeGroupOptions = createChartOptions('pie', { tooltip: { callbacks: { label: c => `${c.label}: ${c.raw}` } } });
					this.renderGenderChart(createChartOptions('pie', { tooltip: { callbacks:{label: (c) => `${c.label}: ${c.raw}`}}}));
					this.renderHomeGroupChart(homeGroupOptions);
					this.renderAgeChart(createChartOptions('bar', { plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', color: getComputedStyle(document.documentElement).getPropertyValue('--fg').trim(), formatter: v => v > 0 ? v : '' } }}) );
					this.renderDistributionChart(createChartOptions('bar', { plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'end', formatter: v => v > 0 ? v : '', color: getComputedStyle(document.documentElement).getPropertyValue('--fg').trim()}}}) );
					this.renderRegistrationChart(createChartOptions('line', { plugins: { datalabels: { display: false }}}));
					document.getElementById('btn_age_filter')?.addEventListener('click', () => this.renderAgeChart(createChartOptions('bar', { plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', color: getComputedStyle(document.documentElement).getPropertyValue('--fg').trim(), formatter: v => v > 0 ? v : ''}}})));
					document.getElementById('age_min')?.addEventListener('click', () => this.renderAgeChart(createChartOptions('bar', { plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', color: getComputedStyle(document.documentElement).getPropertyValue('--fg').trim(), formatter: v => v > 0 ? v : ''}}})));	
					document.getElementById('age_max')?.addEventListener('click', () => this.renderAgeChart(createChartOptions('bar', { plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', color: getComputedStyle(document.documentElement).getPropertyValue('--fg').trim(), formatter: v => v > 0 ? v : ''}}})));	
					document.getElementById('age_min')?.addEventListener('change', () => this.renderAgeChart(createChartOptions('bar', { plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', color: getComputedStyle(document.documentElement).getPropertyValue('--fg').trim(), formatter: v => v > 0 ? v : ''}}})));
					document.getElementById('age_max')?.addEventListener('change', () => this.renderAgeChart(createChartOptions('bar', { plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', color: getComputedStyle(document.documentElement).getPropertyValue('--fg').trim(), formatter: v => v > 0 ? v : ''}}})));				
					document.getElementById('dist_field')?.addEventListener('change', () => this.renderDistributionChart(createChartOptions('bar', { plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'end', formatter: v => v > 0 ? v : '', color: getComputedStyle(document.documentElement).getPropertyValue('--fg').trim()}}})));
					document.getElementById('reg_year')?.addEventListener('change', () => this.renderRegistrationChart(createChartOptions('line', {plugins: { datalabels: { display: false }}})));
					document.getElementById('home_group_chart_title_link')?.addEventListener('click', () => this._showHomeGroupDetailsModal());

				} else { /* ... chart library not found handling ... */ }
			}

			_createOrUpdateChart(chartId, type, data, options, instanceVar) { /* ... same ... */ 
				const canvasEl = document.getElementById(chartId);
				if (!canvasEl) { console.error(`Canvas ${chartId} not found`); return null; }
				const ctx = canvasEl.getContext('2d');
				if (!ctx) { console.error(`Could not get 2D context for ${chartId}`); return null; }
				if (this[instanceVar]) { this[instanceVar].destroy(); }
				try { this[instanceVar] = new Chart(ctx, { type, data, options }); }
				catch (e) { console.error(`Error creating chart ${chartId}:`, e); return null; }
				return this[instanceVar];
			}
			/////////////////////////////////////////
			
	renderGenderChart(options) {
		const genderCounts = this.members.reduce((acc, member) => {
			acc[member.gender = member.gender || 'Unknown'] = (acc[member.gender] || 0) + 1;
			return acc;
		}, {});

		const labels = Object.keys(genderCounts);
		const dataValues = Object.values(genderCounts);
		const backgroundColors = ['#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF'].slice(0, labels.length);

		const chartData = {
			labels: labels,
			datasets: [{
				data: dataValues,
				backgroundColor: backgroundColors,
			}]
		};
		this._createOrUpdateChart('chart_gender', 'doughnut', chartData, options, '_genderChart');

		// --- NEW: Inject stats text ---
		const genderStatsTextEl = document.getElementById('gender_stats_text');
		if (genderStatsTextEl) {
			let statsHTML = `<p><span class="stat-label">Total:</span> <span class="stat-value">${this.members.length}</span></p>`;
			labels.forEach((label, index) => {
				statsHTML += `<p><span class="stat-label">${label}:</span> <span class="stat-value">${dataValues[index]}</span></p>`;
			});
			setElementHTML(genderStatsTextEl, statsHTML);
		} else {
			console.warn("#gender_stats_text element not found for injecting stats.");
		}
	}
	/////////////////////////////////////

	 renderHomeGroupChart(userOptions) { // userOptions should contain the legend generateLabels from previous fix
		const homeGroupCounts = this.members.reduce((acc, m) => {
			const grp = m.homeGroup || 'Unknown';
			acc[grp] = (acc[grp] || 0) + 1;
			return acc;
		}, {});
		const labels = Object.keys(homeGroupCounts);
		const dataValues = Object.values(homeGroupCounts);
		const backgroundColors = ['#ff9f40','#36a2eb','#ffcd56','#4bc0c0','#9966ff','#f39c12','#8e44ad'].slice(0, labels.length);

		const chartData = {
			labels: labels,
			datasets: [{
				data: dataValues,
				backgroundColor: backgroundColors
			}]
		};
		
		// Prepare options for chart interaction (modal on click) AND ensure legend is handled
		const options = {
			...userOptions, // Spread the base options (which should include the legend formatter)
			plugins: {
				...(userOptions.plugins || {}),
				datalabels: { display: false } // Keep datalabels off slices if legend has counts
			},
			interaction: { mode: 'nearest', intersect: true },
			onClick: (evt, elements, chart) => {
				if (!elements.length) return;
				const idx = elements[0].index;
				const groupName = chart.data.labels[idx];
				this._showHomeGroupDetailsModal(groupName);
			}
		};

		this._createOrUpdateChart('chart_group', 'pie', chartData, options, '_groupChart');

		// --- NEW: Inject stats text ---
		const groupStatsTextEl = document.getElementById('group_stats_text');
		if (groupStatsTextEl) {
			let statsHTML = ''; // You might want a total for groups too, or just list them
			let totalInGroups = 0;
			labels.forEach((label, index) => {
				statsHTML += `<p><span class="stat-label">Group ${label}:</span> <span class="stat-value">${dataValues[index]}</span></p>`;
				totalInGroups += dataValues[index];
			});
			// Optionally add a total line if it makes sense
			statsHTML = `<p><span class="stat-label">Total:</span> <span class="stat-value">${totalInGroups}</span></p>` + statsHTML;

			setElementHTML(groupStatsTextEl, statsHTML);
		} else {
			console.warn("#group_stats_text element not found for injecting stats.");
		}
	}
	//////////////////////////////////

			renderAgeChart(options) { /* ... same ... */ 
				const min=parseInt(document.getElementById('age_min')?.value)||0; 
				const max=parseInt(document.getElementById('age_max')?.value)||120; 
				const r={'0-18':0,'19-35':0,'36-50':0,'51-65':0,'66+':0,'Unknown':0}; 
				this.members.forEach(m=>{const age=dateUtils.age(m.dob); if(isNaN(age)){r.Unknown++;} else if(age>=min&&age<=max){if(age<=18)r['0-18']++; else if(age<=35)r['19-35']++; else if(age<=50)r['36-50']++; else if(age<=65)r['51-65']++; else r['66+']++;}}); 
				if(options.scales?.y) options.scales.y.beginAtZero = true; 
				this._createOrUpdateChart('chart_age','bar',{labels:Object.keys(r),datasets:[{label:'Age Distribution',data:Object.values(r),backgroundColor:'#4bc0c0'}]},options,'_ageChart');
			}
			renderDistributionChart(options) { /* ... same ... */ 
				const f=document.getElementById('dist_field')?.value||'gender'; 
				const d=this.members.reduce((a,m)=>{const key=m[f]||'Unknown';a[key]=(a[key]||0)+1;return a;},{}); 
				if(options.scales?.x) options.scales.x.beginAtZero = true; // Should be y-axis for bar chart values
				if(options.scales?.y) options.scales.y.beginAtZero = true; 
				this._createOrUpdateChart('chart_dist','bar',{labels:Object.keys(d),datasets:[{label:f.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase()),data:Object.values(d),backgroundColor:['#ff6384','#36a2eb','#ffce56', '#4bc0c0']}]},options,'_distChart');
			}
			renderRegistrationChart(options) { /* ... same ... */ 
				const sel=document.getElementById('reg_year'); 
				const yrs=[...new Set(this.members.map(m => { const d = dateUtils.parse(m.join); return d ? d.getFullYear() : null; }).filter(y => y !== null) )].sort((a,b)=>b-a); 
				if(sel&&sel.options.length===0){yrs.forEach(y=>sel.add(new Option(y,y)));if(yrs.length>0)sel.value=yrs[0];} 
				const y=parseInt(sel?.value)||new Date().getFullYear(); 
				const mReg=Array(12).fill(0);
				this.members.forEach(m=>{const d=dateUtils.parse(m.join);if(d&&d.getFullYear()===y)mReg[d.getMonth()]++;}); 
				if(options.scales?.y) options.scales.y.beginAtZero = true; 
				this._createOrUpdateChart('chart_reg','line',{labels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],datasets:[{label:`Registrations in ${y}`,data:mReg,borderColor:'#36a2eb',tension:0.1}]},options,'_regChart');
			}
	/////////////////////////////////////////////////////////////

	loadRegister() {
		console.log("Loading Register page...");
		const pageEl = document.getElementById('page_register');
		if (!pageEl) {
			console.error("Register page element #page_register not found.");
			showToast("Error: Register page UI missing.", "error");
			return;
		}
		setElementHTML(pageEl, tpl.register); // This recreates the form content
		this.setupProfilePictureFeatures();
		this.currentEditId = null;
		const submitButton = document.getElementById('mmd_form')?.querySelector('button[type="submit"]');
		if (submitButton) submitButton.textContent = 'Register Household';

		// Get all interactive elements AFTER setElementHTML has populated the form
		const formEl = document.getElementById('mmd_form');
		if (!formEl) {
			console.error("Form #mmd_form not found after tpl.register render.");
			return;
		}

		const maritalStatusSelect = formEl.querySelector('#f_marital'); // Query within the form
		const spouseSection = formEl.querySelector('#spouse_section');

		const childrenCountInput = formEl.querySelector('#f_children');
		const childrenSection = formEl.querySelector('#children_section');
		const childrenFieldsContainer = formEl.querySelector('#children_section_fields');

		const otherRelativesCountInput = formEl.querySelector('#f_other_relatives_count');
		const otherRelativesSection = formEl.querySelector('#other_relatives_section');
		const otherRelativesFieldsContainer = formEl.querySelector('#other_relatives_section_fields');

		// --- Marital Status and Spouse Section Logic ---
		if (maritalStatusSelect && spouseSection) {
			const toggleSpouseSection = () => {
				// console.log("Marital status changed to:", maritalStatusSelect.value);
				spouseSection.classList.toggle('visible', maritalStatusSelect.value === 'Married');
			};
			maritalStatusSelect.onchange = toggleSpouseSection;
			toggleSpouseSection(); // Call once to set initial visibility based on default marital status
		} else {
			console.warn("Marital status select or spouse section not found in the form.");
		}

		// --- Children Section Logic ---
		if (childrenCountInput && childrenSection && childrenFieldsContainer) {
			const handleChildrenCountChange = () => {
				const numChildren = Math.max(0, parseInt(childrenCountInput.value) || 0);
				setElementHTML(childrenFieldsContainer, ''); // Clear previous
				if (numChildren > 0) {
					childrenSection.classList.add('visible');
					let childrenHTML = '';
					for (let i = 0; i < numChildren; i++) {
						childrenHTML += `
							<div class="full-width section-divider"><h4>Child ${i + 1}</h4></div>
							<label>Name<input id="c_name${i}"></label>
							<label>DOB<input type="date" id="c_dob${i}"></label>
							<label>Gender<select id="c_gender${i}"><option>Male</option><option>Female</option><option>Other</option></select></label>
							<label>Phone<input type="tel" id="c_phone${i}"></label>
							<label class="full-width">Email<input type="email" id="c_email${i}"></label>
							<label>Joined (if different)<input type="date" id="c_join${i}"></label>
							<label>Baptism<select id="c_bapt${i}"><option value="">--Select--</option><option>Baptized</option><option>Not Baptized</option></select></label>
						`;
					}
					setElementHTML(childrenFieldsContainer, childrenHTML);
				} else {
					childrenSection.classList.remove('visible');
				}
			};
			childrenCountInput.oninput = handleChildrenCountChange;
			handleChildrenCountChange(); // Initial call
		} else {
			console.warn("Children count input, section, or fields container not found.");
		}

		// --- Other Relatives Section Logic ---
		if (otherRelativesCountInput && otherRelativesSection && otherRelativesFieldsContainer) {
			const handleOtherRelativesCountChange = () => {
				const numOtherRelatives = Math.max(0, parseInt(otherRelativesCountInput.value) || 0);
				setElementHTML(otherRelativesFieldsContainer, ''); // Clear previous
				if (numOtherRelatives > 0) {
					otherRelativesSection.classList.add('visible');
					let relativesHTML = '';
					for (let i = 0; i < numOtherRelatives; i++) {
						relativesHTML += `
							<div class="full-width section-divider"><h4>Other Relative ${i + 1}</h4></div>
							<label class="required">Full Name<input id="or_name${i}" required></label>
							<label>Relationship to Head<input id="or_relation${i}" placeholder="e.g., Parent, Sibling"></label>
							<label>DOB<input type="date" id="or_dob${i}"></label>
							<label>Gender<select id="or_gender${i}"><option>Male</option><option>Female</option><option>Other</option></select></label>
							<label>Phone<input type="tel" id="or_phone${i}"></label>
							<label class="full-width">Email<input type="email" id="or_email${i}"></label>
							<label>Joined Date (if different)<input type="date" id="or_join${i}"></label>
							<label>Baptism<select id="or_bapt${i}"><option value="">--Select--</option><option>Baptized</option><option>Not Baptized</option></select></label>
						`;
					}
					setElementHTML(otherRelativesFieldsContainer, relativesHTML);
				} else {
					otherRelativesSection.classList.remove('visible');
				}
			};
			otherRelativesCountInput.oninput = handleOtherRelativesCountChange;
			handleOtherRelativesCountChange(); // Initial call
		} else {
			console.warn("Other relatives count input, section, or fields container not found.");
		}

		// Form submission handler
		formEl.onsubmit = e => {
			e.preventDefault();
			this.submitMemberForm();
		};
	}


          ////////////////////////////////////////

setupProfilePictureFeatures() {

  const previewImageEl = document.querySelector('#f_profile_pic_preview');
  const profilePicInput = document.querySelector('#f_profile_pic');

   function initCropperLogic() {
    if (!document.getElementById('crop-modal')) {
      const modal = document.createElement('div');
      modal.id = 'crop-modal';
      modal.style = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:10000;';
modal.innerHTML = `
  <div style="
    background:white;
    padding:20px;
    border-radius:8px;
    max-width:90vw;
    max-height:90vh;
    overflow:auto;
    text-align:center;
    display:flex;
    flex-direction:column;
    align-items:center;
  ">
<img id="crop-image" style="max-width:90vw;max-height:60vh;object-fit:contain;border:1px solid #ccc;" />
    <div style="margin-top:10px;display:flex;justify-content:center;gap:10px;flex-wrap:wrap;">
      <button id="crop-confirm" style="padding:10px 20px;">Crop</button>
      <button id="crop-cancel" style="padding:10px 20px;">Cancel</button>
    </div>
  </div>`;
      document.body.appendChild(modal);
      modal.style.display = 'none';
    }

    const cropModal = document.getElementById('crop-modal');
    const cropImage = document.getElementById('crop-image');
    const cropConfirm = document.getElementById('crop-confirm');
    const cropCancel = document.getElementById('crop-cancel');
    let cropper = null;

    profilePicInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        showToast('Invalid image type. Please select JPG, PNG, or WebP.', 'error');
        e.target.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image too large. Max size is 5MB.', 'error');
        e.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        cropImage.src = ev.target.result;
        cropModal.style.display = 'flex';
        cropper = new Cropper(cropImage, {
          aspectRatio: 1,
          viewMode: 1
        });
      };
      reader.readAsDataURL(file);
    });

    cropConfirm?.addEventListener('click', () => {
      if (cropper) {
        const canvas = cropper.getCroppedCanvas({ width: 300, height: 300 });
        const dataUrl = canvas.toDataURL('image/jpeg');
        if (previewImageEl) previewImageEl.src = dataUrl;

        canvas.toBlob(blob => {
          const newFile = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
          const dt = new DataTransfer();
          dt.items.add(newFile);
          profilePicInput.files = dt.files;
        });

        cropper.destroy();
        cropModal.style.display = 'none';
      }
    });

    cropCancel?.addEventListener('click', () => {
      cropper?.destroy();
      cropModal.style.display = 'none';
    });
  }

  // Load Cropper.js dynamically if not already loaded
 if (typeof Cropper === 'undefined') {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/cropperjs@1.5.13/dist/cropper.min.css';
  document.head.appendChild(link);

  const script = document.createElement('script');
  script.src = 'https://unpkg.com/cropperjs@1.5.13/dist/cropper.min.js';
  script.onload = initCropperLogic;
  document.body.appendChild(script);
} else {
  initCropperLogic();
}

  const formEl = document.getElementById('mmd_form');
  if (formEl) {
    formEl.addEventListener('reset', () => {
      if (previewImageEl) previewImageEl.src = this.DEFAULT_PROFILE_PIC_URL;
      if (profilePicInput) profilePicInput.value = '';
    });

  }
}





	//////////////////////////////////////////////////////////////////////////////

async submitMemberForm() {

  if (!document.getElementById('profile-pic-style')) {
    const style = document.createElement('style');
    style.id = 'profile-pic-style';
    style.textContent = `
      .profile-picture {
        width: 100px;
        height: 100px;
        object-fit: cover;
        border-radius: 50%;
        border: 2px solid #ccc;
        transition: transform 0.2s ease-in-out;
      }
      .profile-picture:hover {
        transform: scale(1.1);
        cursor: zoom-in;
      }
      #image-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        display: none;
      }
      #image-modal img {
        max-width: 80%;
        max-height: 80%;
        border-radius: 8px;
      }
    `;
    document.head.appendChild(style);
  }

  if (!document.getElementById('image-modal')) {
    const modal = document.createElement('div');
    modal.id = 'image-modal';
    modal.innerHTML = '<img src="" alt="Zoomed Image" />';
    modal.addEventListener('click', () => modal.style.display = 'none');
    document.body.appendChild(modal);
  }

  const formEl = document.getElementById('mmd_form');
  if (!formEl) {
    showToast("Error: Registration form not found.", "error");
    return;
  }

   formEl.addEventListener('reset', () => {
  const previewImageEl = formEl.querySelector('#f_profile_pic_preview');
  const profilePicInput = formEl.querySelector('#f_profile_pic');
  if (previewImageEl) previewImageEl.src = this.DEFAULT_PROFILE_PIC_URL;
  if (profilePicInput) profilePicInput.value = '';
});

  async function safeUploadProfilePicture(profilePicFile, memberIdForStoragePath, originalMemberData) {
    console.log("[UPLOAD DEBUG] Auth UID:", this.user?.uid);
    console.log("[UPLOAD DEBUG] Target memberIdForStoragePath:", memberIdForStoragePath);
    try {
      const userDoc = await db.collection('users').doc(this.user.uid).get();
      if (!userDoc.exists || userDoc.data().role !== 'admin') {
        showToast("Upload failed: You do not have permission to upload profile pictures.", "error");
        return this.DEFAULT_PROFILE_PIC_URL;
      }

      const fileExtension = profilePicFile.name.split('.').pop();
      const uniqueFileName = `profile_${Date.now()}.${fileExtension}`;
      const filePath = `profile_pictures/${memberIdForStoragePath}/${uniqueFileName}`;
      const imageStorageRef = firebase.storage().ref(filePath);
      showToast("Uploading profile picture...", "info", 3000);
      const uploadTaskSnapshot = await imageStorageRef.put(profilePicFile);
      const finalProfilePictureUrl = await uploadTaskSnapshot.ref.getDownloadURL();

      if (originalMemberData?.profilePictureUrl && originalMemberData.profilePictureUrl !== finalProfilePictureUrl) {
        try {
          if (originalMemberData.profilePictureUrl.startsWith('http')) {
            const oldImageRef = firebase.storage().refFromURL(originalMemberData.profilePictureUrl);
            await oldImageRef.delete();
          } else {
            console.warn("Skipping deletion: profilePictureUrl is not a downloadable Firebase URL.");
          }
        } catch (deleteError) {
          console.warn("Could not delete old profile picture:", deleteError.message);
        }
      }

      return finalProfilePictureUrl;
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      showToast(`Profile picture upload failed: ${error.message}`, "error", 7000);
      return originalMemberData?.profilePictureUrl || this.DEFAULT_PROFILE_PIC_URL;
    }
  }

  async function handleProfilePictureUpload(form, isEditingMember, originalMemberData, memberIdForStoragePath) {
    const profilePicInput = form.querySelector('#f_profile_pic');
const profilePicFile = profilePicInput ? profilePicInput.files[0] : null;
    let finalProfilePictureUrl = (isEditingMember && originalMemberData?.profilePictureUrl) ? originalMemberData.profilePictureUrl : this.DEFAULT_PROFILE_PIC_URL;

    if (profilePicFile && memberIdForStoragePath && memberIdForStoragePath.trim() !== '') {
      finalProfilePictureUrl = await safeUploadProfilePicture.call(this, profilePicFile, memberIdForStoragePath, originalMemberData);
    }

    return finalProfilePictureUrl;
  }


  // Setup image preview handlers for all profile picture inputs
  const previewImage = (inputId, previewId) => {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (input && preview) {
      input.addEventListener('change', () => {
        const file = input.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = e => {
            preview.src = e.target.result;
            preview.style.display = 'block';
          };
          reader.readAsDataURL(file);
        } else {
          preview.src = '#';
          preview.style.display = 'none';
        }
      });
    }
  };

  // Apply preview bindings
  previewImage('f_profile_pic', 'f_profile_pic_preview');
  previewImage('f_s_profile_pic', 'f_s_profile_pic_preview');
  for (let i = 0; i < 10; i++) {
    previewImage(`c_profile_pic${i}`, `c_profile_pic_preview${i}`);
    previewImage(`or_profile_pic${i}`, `or_profile_pic_preview${i}`);
  }
  const editorName = this.user && this.user.displayName ? this.user.displayName : (this.user ? this.user.email : 'Unknown User');
  if (!editorName || editorName === 'Unknown User') {
    showToast("Error: User information not available. Cannot proceed.", "error");
    return;
  }

  const form = document.getElementById('mmd_form');
  if (!form) {
    showToast("Error: Registration form not found.", "error");
    return;
  }
  toggleSpinner(true);

  let isEditingMember = !!this.currentEditId;
  let originalMemberData = null;
  let isEditingHead = false;
  let firestoreDocIdToUpdate = null;

  if (isEditingMember) {
    const originalMemberIndex = this.members.findIndex(m => m.id === this.currentEditId);
    if (originalMemberIndex !== -1) {
      originalMemberData = { ...this.members[originalMemberIndex] };
      isEditingHead = originalMemberData.isHouseholdHead;
      firestoreDocIdToUpdate = originalMemberData.id;
    } else {
      showToast("Error: Original member data for update not found.", "error");
      toggleSpinner(false);
      return;
    }
  } else {
    isEditingHead = true;
  }

  let memberDataFromForm = {
    fullName: form.f_name.value.trim(),
    dob: form.f_dob.value,
    gender: form.f_gender.value,
    baptismStatus: form.f_bapt.value,
    position: form.f_pos.value,
    homeGroup: form.f_group.value,
    maritalStatus: form.f_marital.value,
    lastEditedBy: editorName,
    lastEditedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (isEditingHead || !isEditingMember) {
    memberDataFromForm.joinDate = form.f_join.value;
    memberDataFromForm.phone = form.f_phone.value.trim();
    memberDataFromForm.email = form.f_email.value.trim().toLowerCase();
    memberDataFromForm.address = form.f_addr.value.trim();
    if (!memberDataFromForm.fullName || !memberDataFromForm.dob || !memberDataFromForm.joinDate || !memberDataFromForm.phone || !memberDataFromForm.email || !memberDataFromForm.address) {
      showToast("Please fill all required fields for the Head of Household.", "error");
      toggleSpinner(false);
      return;
    }
  } else {
    memberDataFromForm.phone = form.f_phone.value.trim();
    memberDataFromForm.email = form.f_email.value.trim().toLowerCase();
    const head = this.members.find(h => h.id === originalMemberData.householdId && h.isHouseholdHead);
    memberDataFromForm.joinDate = form.f_join.value.trim() || (head ? head.joinDate : originalMemberData.joinDate);
    memberDataFromForm.address = form.f_addr.value.trim() || (head ? head.address : originalMemberData.address);
    if (!memberDataFromForm.fullName || !memberDataFromForm.dob) {
      showToast("Full Name and Date of Birth are required for the member.", "error");
      toggleSpinner(false);
      return;
    }
  }

  let memberIdForStoragePath;
  if (isEditingMember) {
    memberIdForStoragePath = originalMemberData.authUid || originalMemberData.id;
  } else {
    const isSelfRegistration = this.user && this.user.uid && form.f_email && form.f_email.value.toLowerCase().trim() === this.user.email.toLowerCase().trim();
    if (isSelfRegistration) {
      memberIdForStoragePath = this.user.uid;
    } else {
      memberIdForStoragePath = `M${Date.now()}${Math.random().toString(36).substring(2, 7)}-H`;
    }
  }

  memberDataFromForm.profilePictureUrl = await (typeof handleProfilePictureUpload !== 'undefined' ? await handleProfilePictureUpload.call(this, form, isEditingMember, originalMemberData, memberIdForStoragePath) : this.DEFAULT_PROFILE_PIC_URL);

  // 4. Prepare Firestore Batch
  const batch = db.batch();
  let mainActionType = "";
  let mainLogDetails = "";
  let combinedActionLogDetails = "";

  try {
    if (isEditingMember) {
      mainActionType = "Updated Member";
      const memberDocId = firestoreDocIdToUpdate;
      const memberRef = db.collection('members').doc(memberDocId);
      const finalDataToUpdate = { ...originalMemberData, ...memberDataFromForm };
      finalDataToUpdate.authUid = originalMemberData.authUid || null;

      if (isEditingHead) {
        finalDataToUpdate.isHouseholdHead = true;
        finalDataToUpdate.relationshipToHead = 'Head';
      } else {
        finalDataToUpdate.isHouseholdHead = false;
        if (finalDataToUpdate.relationshipToHead === 'Head') finalDataToUpdate.relationshipToHead = 'Member';
      }

      batch.update(memberRef, finalDataToUpdate);
      mainLogDetails = `Updated ${finalDataToUpdate.fullName} (ID: ${memberDocId}).`;

    } else {
      mainActionType = "Registered Household";
      const headMemberDocId = memberIdForStoragePath;
      let authUidForNewHead = null;

      const headData = {
        ...memberDataFromForm,
        id: headMemberDocId,
        authUid: authUidForNewHead,
        householdId: headMemberDocId,
        isHouseholdHead: true,
        relationshipToHead: 'Head',
        spouseId: null
      };

      batch.set(db.collection('members').doc(headMemberDocId), headData);
      mainLogDetails = `Registered Head: ${headData.fullName} (ID: ${headMemberDocId}).`;

      if (headData.maritalStatus === 'Married' && form.f_s_name.value.trim()) {
        const spouseId = `M${Date.now()}${Math.random().toString(36).substring(2, 7)}-S`;
        const spouseProfilePicInput = form.querySelector('#f_s_profile_pic');
const spouseProfilePicFile = spouseProfilePicInput ? spouseProfilePicInput.files[0] : null;
let spouseProfilePictureUrl = this.DEFAULT_PROFILE_PIC_URL;
if (spouseProfilePicFile) {
  spouseProfilePictureUrl = await handleProfilePictureUpload.call(this, form, false, null, spouseId);
}

const spouseData = {
  fullName: form.f_s_name.value.trim(),
  dob: form.f_s_dob.value,
  gender: form.f_s_gender.value,
  joinDate: form.f_s_join.value || headData.joinDate,
  phone: form.f_s_phone.value.trim(),
  email: form.f_s_email.value.trim().toLowerCase(),
  address: form.f_s_addr.value.trim() || headData.address,
  baptismStatus: form.f_s_bapt.value,
  position: form.f_s_pos.value || 'Member',
  homeGroup: headData.homeGroup,
  maritalStatus: 'Married',
  householdId: headMemberDocId,
  isHouseholdHead: false,
  relationshipToHead: 'Spouse',
  spouseId: headMemberDocId,
  lastEditedBy: editorName,
  lastEditedAt: firebase.firestore.FieldValue.serverTimestamp(),
  id: spouseId,
  profilePictureUrl: spouseProfilePictureUrl,
          authUid: null
        };
        batch.set(db.collection('members').doc(spouseId), spouseData);
        batch.update(db.collection('members').doc(headMemberDocId), { spouseId });
        mainLogDetails += ` Spouse: ${spouseData.fullName}.`;
      }

      const numChildren = parseInt(form.f_children.value) || 0;
      for (let i = 0; i < numChildren; i++) {
        const childName = document.getElementById(`c_name${i}`)?.value.trim();
        if (childName) {
          const childId = `M${Date.now()}${Math.random().toString(36).substring(2, 7)}-C${i}`;
          const childPicInput = document.getElementById(`c_profile_pic${i}`);
const childPicFile = childPicInput ? childPicInput.files[0] : null;
let childProfilePictureUrl = this.DEFAULT_PROFILE_PIC_URL;
if (childPicFile) {
  childProfilePictureUrl = await handleProfilePictureUpload.call(this, form, false, null, childId);
}

const childData = {
  fullName: childName,
  dob: document.getElementById(`c_dob${i}`)?.value,
  gender: document.getElementById(`c_gender${i}`)?.value,
  joinDate: document.getElementById(`c_join${i}`)?.value || headData.joinDate,
  phone: document.getElementById(`c_phone${i}`)?.value.trim(),
  email: document.getElementById(`c_email${i}`)?.value.trim().toLowerCase(),
  address: headData.address,
  baptismStatus: document.getElementById(`c_bapt${i}`)?.value,
  position: 'Member',
  homeGroup: headData.homeGroup,
  maritalStatus: 'Single',
  householdId: headMemberDocId,
  isHouseholdHead: false,
  relationshipToHead: 'Child',
  spouseId: null,
  lastEditedBy: editorName,
  lastEditedAt: firebase.firestore.FieldValue.serverTimestamp(),
  id: childId,
  profilePictureUrl: childProfilePictureUrl,
            authUid: null
          };
          batch.set(db.collection('members').doc(childId), childData);
          mainLogDetails += ` Child: ${childData.fullName}.`;
        }
      }
    }

    combinedActionLogDetails = `${mainLogDetails}`;
    // Other Relatives for New Head
    const numOtherRelatives = parseInt(form.f_other_relatives_count.value) || 0;
    for (let i = 0; i < numOtherRelatives; i++) {
      const relativeName = document.getElementById(`or_name${i}`)?.value.trim();
      if (relativeName) {
        const relativeId = `M${Date.now()}${Math.random().toString(36).substring(2, 7)}-OR${i}`;
        const relativePicInput = document.getElementById(`or_profile_pic${i}`);
        const relativePicFile = relativePicInput ? relativePicInput.files[0] : null;
        let relativeProfilePictureUrl = this.DEFAULT_PROFILE_PIC_URL;
        if (relativePicFile) {
          relativeProfilePictureUrl = await handleProfilePictureUpload.call(this, form, false, null, relativeId);
        }

        const relativeData = {
          fullName: relativeName,
          relationshipToHead: document.getElementById(`or_relation${i}`)?.value.trim() || 'Other Relative',
          dob: document.getElementById(`or_dob${i}`)?.value,
          gender: document.getElementById(`or_gender${i}`)?.value,
          phone: document.getElementById(`or_phone${i}`)?.value.trim(),
          email: document.getElementById(`or_email${i}`)?.value.trim().toLowerCase(),
          joinDate: document.getElementById(`or_join${i}`)?.value || headData.joinDate,
          baptismStatus: document.getElementById(`or_bapt${i}`)?.value,
          address: headData.address,
          position: 'Member',
          homeGroup: headData.homeGroup,
          maritalStatus: 'Single',
          householdId: headMemberDocId,
          isHouseholdHead: false,
          spouseId: null,
          lastEditedBy: editorName,
          lastEditedAt: firebase.firestore.FieldValue.serverTimestamp(),
          id: relativeId,
          profilePictureUrl: relativeProfilePictureUrl,
          authUid: null
        };
        batch.set(db.collection('members').doc(relativeId), relativeData);
        mainLogDetails += ` Other Relative: ${relativeData.fullName}.`;
      }
    }

    await batch.commit();
    showToast(isEditingMember ? "Member updated successfully!" : "Household registered successfully!", "success");
    await this.initializeData();
    logAction(mainActionType, combinedActionLogDetails, '', editorName);
    form.reset();
    const profilePicInput = form.querySelector('#f_profile_pic');
    if (profilePicInput) profilePicInput.value = null;
    const profilePicPreviewEl = form.querySelector('#f_profile_pic_preview');
    if (profilePicPreviewEl) {
      profilePicPreviewEl.src = '#';
      profilePicPreviewEl.style.display = 'none';
    }
    this.currentEditId = null;
    this.filteredMembers = [...this.members];
    const viewMembersButton = document.querySelector('#mmd_tabs button[data-page="view"]');
    if (viewMembersButton) viewMembersButton.click();
  } catch (error) {
    console.error("Error during form submission process:", error);
    showToast("Operation failed: " + (error.message || "Unknown error"), "error");
  } finally {
    toggleSpinner(false);
  }
}







/////////////////////////////////

renderViewContent() {
			console.log("CCC Dashboard: Rendering View content. Mode:", this.viewMode, "Selected Members:", this.selectedMemberIds.length, "Members to display:", this.filteredMembers ? this.filteredMembers.length : 'N/A');
			const membersToDisplay = this.filteredMembers;
			const cont = document.getElementById('view_content');

			if (!cont) {
				console.error("CCC Dashboard: View content container #view_content not found.");
				showToast("Error: View content UI area missing.", "error");
				return;
			}

            if (!membersToDisplay || !Array.isArray(membersToDisplay)) {
                 console.error("CCC Dashboard: membersToDisplay is not a valid array in renderViewContent:", membersToDisplay);
                 setElementHTML(cont, "<p class='info-message'>Error: Member data is currently unavailable for display. Please try reloading or check console.</p>");
                 this.updateDynamicRouteBar();
                 return;
            }

			if (membersToDisplay.length === 0) {
				setElementHTML(cont, "<p class='info-message'>No members match the current filters or search.</p>");
				this.updateDynamicRouteBar();
				return;
			}

            const defaultPic = this.DEFAULT_PROFILE_PIC_URL;
            const isAdmin = this.role === 'admin'; // Check user role once

			if (this.viewMode === 'card') {
                cont.className = 'card_view';
                let cardsHTML = "";
                try {
                    cardsHTML = membersToDisplay.map(m => {
                        if (!m || !m.id) {
                            console.warn("Skipping invalid member object in card view map:", m);
                            return '';
                        }
                        const canBeRouted = m.address && m.address.trim() !== '';
                        const isSelected = this.selectedMemberIds.includes(m.id);
                        let checkboxHTML = '';

                        if (canBeRouted) {
                            checkboxHTML = `
                                <div style="position: absolute; top: 5px; right: 5px; background: padding: 3px; border-radius: 3px; z-index: 5;">
                                    <input type="checkbox" class="route-select-checkbox"
                                           data-member-id="${m.id}"
                                           data-address="${encodeURIComponent(m.address || '')}"
                                           data-name="${encodeURIComponent(m.fullName || '')}"
                                           ${isSelected ? 'checked' : ''}
                                           title="Select Member">
                                </div>`;
                        }

                        let dobDisplayCard = '';
                        if (isAdmin) {
                            dobDisplayCard = `<strong>DOB:</strong> ${dateUtils.format(m.dob)} | `;
                        }

                        return `
                            <div class="member-card" data-id="${m.id}" style="position: relative;">
                              ${checkboxHTML}
                              <img src="${m.profilePictureUrl || defaultPic}" class="member_profile_pic" alt="${m.fullName || 'Profile'}">
                              <div class="basic-info">
                                <h4>${m.fullName || 'N/A'}</h4>
                                <p><strong>Age:</strong> ${dateUtils.age(m.dob)}</p>
                                <p><strong>Group:</strong> ${m.homeGroup || 'N/A'}</p>
                                <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px;">
                                  <button type="button" class="toggle-details-btn generic_button_styles">▼ Show More</button>
                                  ${m.householdId && this.members.filter(f => f.householdId === m.householdId).length > 1 ? `
                                    <button class="view-family-btn generic_button_styles" data-member-id="${m.id}" data-household-id="${m.householdId || m.id}"">
                                      👨‍👩‍👧 View Family
                                    </button>
                                  ` : ''}
                                </div>
                                <div class="member-details">
                                  <p>${dobDisplayCard}<strong>Gender:</strong> ${m.gender || 'N/A'}</p>
                                  <p><strong>Position:</strong> ${m.position || 'N/A'}</p>
                                  <p><strong>Marital:</strong> ${m.maritalStatus || 'N/A'}</p>
                                  <p>📞 <a href="tel:${m.phone}">${m.phone || 'N/A'}</a></p>
                                  <p>✉️ <a href="mailto:${m.email}">${m.email || 'N/A'}</a></p>
                                  <p>📍 <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.address || '')}" target="_blank">${m.address || 'N/A'}</a></p>
                                  <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--sec); text-align: right;">
                                      <button class="btn_edit_member generic_button_styles" data-id="${m.id}" style="padding:5px 10px;font-size:0.8rem;">Edit</button>
                                      <button class="btn_delete_member generic_button_styles danger" data-id="${m.id}" style="padding:5px 10px;font-size:0.8rem;">Delete</button>
                                  </div>
                                </div>
                              </div>
                            </div>`;
                    }).join('');
                } catch (mapError) {
                    console.error("CCC Dashboard: Error during card HTML generation:", mapError);
                    setElementHTML(cont, "<p class='info-message'>Error displaying member cards. Check console.</p>");
                    this.updateDynamicRouteBar();
                    return;
                }
                setElementHTML(cont, cardsHTML);
                if (typeof bindViewFamilyButtonsWhenReady === 'function') { bindViewFamilyButtonsWhenReady(); }

			} else { // Table view
				cont.className = '';
                let rowsHTML = "";
                try {
                    rowsHTML = membersToDisplay.map(m => {
                        if (!m || !m.id) {
                            console.warn("Skipping invalid member object in table view map:", m);
                            return '';
                        }
                        let relationshipDisplay = '';
                        const head = m.householdId ? this.members.find(headMember => headMember.id === m.householdId && headMember.isHouseholdHead) : null;
                        const headName = head ? head.fullName : 'N/A';

                        if (m.isHouseholdHead) {
                            relationshipDisplay = "Head of Household";
                            if ((m.maritalStatus === "Married" || m.marital === "Married") && m.spouseId) {
                                const spouse = this.members.find(sp => sp.id === m.spouseId);
                                relationshipDisplay += ` (Spouse: ${spouse && spouse.fullName ? spouse.fullName : 'Linked'})`;
                            }
                        } else if (m.relationshipToHead === 'Spouse' && head) {
                            relationshipDisplay = `Spouse of ${headName}`;
                        } else if (m.relationshipToHead === 'Child' && head) {
                            relationshipDisplay = `Child of ${headName}`;
                        } else if (m.relationshipToHead && head) {
                            relationshipDisplay = `${m.relationshipToHead} of ${headName}`;
                        } else if (m.relationshipToHead) {
                            relationshipDisplay = m.relationshipToHead;
                        } else {
                            relationshipDisplay = "Member";
                        }

                        const canBeRouted = m.address && m.address.trim() !== '';
                        const isSelected = this.selectedMemberIds.includes(m.id);
                        let checkboxHTML = '';

                        if (canBeRouted) {
                            checkboxHTML = `<input type="checkbox" class="route-select-checkbox"
                                                    data-member-id="${m.id}"
                                                    data-address="${encodeURIComponent(m.address || '')}"
                                                    data-name="${encodeURIComponent(m.fullName || '')}"
                                                    ${isSelected ? 'checked' : ''}>`;
                        }

                        let dobDisplayTable = 'Restricted';
                        if (isAdmin) {
                            dobDisplayTable = dateUtils.format(m.dob);
                        }

                        return `
                          <tr data-id="${m.id}">
                            <td style="text-align:center; vertical-align:middle; width:40px;">${checkboxHTML}</td>
                            <td>
                              <img src="${m.profilePictureUrl || defaultPic}" alt="Profile of ${m.fullName || ''}" style="width:45px;height:45px;border-radius:50%;object-fit:cover;">
                            </td>
                            <td>${m.fullName || 'N/A'}</td>
                            <td>${relationshipDisplay}</td>
                            <td>${dobDisplayTable}</td>
                            <td>${dateUtils.age(m.dob)}</td>
                            <td>${m.gender || 'N/A'}</td>
                            <td>${m.maritalStatus || m.marital || 'N/A'}</td>
                            <td><a href="tel:${m.phone}" class="contact-link">${m.phone||'N/A'}</a></td>
                            <td><a href="mailto:${m.email}" class="contact-link">${m.email||'N/A'}</a></td>
                            <td><a class="map-link contact-link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.address || '')}" target="_blank" rel="noopener noreferrer">${m.address||'N/A'}</a></td>
                            <td>${dateUtils.format(m.joinDate || '')}</td>
                            <td>${m.position || 'N/A'}</td>
                            <td>${m.homeGroup||'N/A'}</td>
                            <td>
                              <button class="btn_edit_member generic_button_styles" data-id="${m.id}" style="padding:5px 8px;font-size:0.8rem;">Edit</button>
                              <button class="btn_delete_member generic_button_styles danger" data-id="${m.id}" style="padding:5px 8px;font-size:0.8rem;">Delete</button>
                            </td>
                          </tr>`;
                    }).join('');
                } catch (mapError) {
                    console.error("CCC Dashboard: Error during table row HTML generation:", mapError);
                    setElementHTML(cont, "<p class='info-message'>Error displaying member table. Check console.</p>");
                    this.updateDynamicRouteBar();
                    return;
                }

				setElementHTML(cont, `<table id="mmd_table" class="sortable-theme-bootstrap" data-sortable>
										<thead><tr>
											<th style="width:50px; text-align:center;" data-sortable="false">Route</th>
											<th>Photo</th><th>Name</th><th>Relationship</th><th>DOB</th><th>Age</th><th>Gender</th><th>Marital Status</th><th>Phone</th><th>Email</th><th>Address</th><th>Joined</th><th>Position</th><th>Group</th><th data-sortable="false">Actions</th>
										</tr></thead>
										<tbody>${rowsHTML}</tbody>
									  </table>`);
				if (window.Tablesort && cont.querySelector('table#mmd_table')) {
					const tableEl = cont.querySelector('table#mmd_table');
					if (!tableEl.tablesortInstance) {
						tableEl.tablesortInstance = new Tablesort(tableEl);
					} else {
						tableEl.tablesortInstance.refresh();
					}
				}
			}

            // --- Attach event listeners AFTER content is set ---
			const viewContentContainer = document.getElementById('view_content');
			if (viewContentContainer) {
				viewContentContainer.querySelectorAll('.route-select-checkbox').forEach(checkbox => {
					checkbox.onchange = (e) => {
						const memberId = e.target.dataset.memberId;
						this.toggleMemberSelection(memberId, e.target.checked);
					};
				});

				viewContentContainer.querySelectorAll('.btn_edit_member').forEach(btn => {
					btn.onclick = (e) => this.editMember(e.target.dataset.id);
				});
				viewContentContainer.querySelectorAll('.btn_delete_member').forEach(btn => {
					btn.onclick = (e) => this.deleteMember(e.target.dataset.id);
				});
				viewContentContainer.querySelectorAll('.view-family-btn').forEach(btn => {
					btn.onclick = (e) => this._showFamilyModal(e.target.dataset.householdId || e.target.dataset.memberId);
				});
			}
			this.updateDynamicRouteBar();
		}

///////////////////////

			//Family view
			_showFamilyModal(viewedMemberId) {
		const viewedMember = this.members.find(m => m.id === viewedMemberId);
		if (!viewedMember) {
			showToast("Member not found for family view.", "error");
			return;
		}

		if (!viewedMember.householdId) {
			// Use your existing showModal function for consistency
			showModal(
				`${viewedMember.fullName}'s Family`,
				"<p>This member is not currently part of a defined household.</p>",
				[{ label: "Close", action: (modal) => modal.remove() }]
			);
			return;
		}

		const householdMembers = this.members.filter(m => m.householdId === viewedMember.householdId);
		const headOfHousehold = householdMembers.find(m => m.isHouseholdHead || m.relationshipToHead === 'Head');
                        householdMembers.find(m => m.id === householdId);
		// Fallback if no explicit head, though data should be consistent
		// If viewedMember is the head, use them. Otherwise, use the found head, or first member as last resort.
		const effectiveHead = headOfHousehold || (viewedMember.isHouseholdHead ? viewedMember : householdMembers[0]); 
		const effectiveHeadName = effectiveHead ? effectiveHead.fullName : 'this Household';


		let listHTML = `<h4>Family of ${effectiveHeadName} <br><small>(Viewing from ${viewedMember.fullName}'s perspective)</small></h4><ul>`;
		const displayOrder = [];
		const processedIds = new Set();

		// 1. The viewed person - ensure they are always first if not the effectiveHead for title
		displayOrder.push({ member: viewedMember, relationLabel: `Viewing: ${viewedMember.fullName}` });
		processedIds.add(viewedMember.id);

		// Determine relationships based on the viewedMember
		// Parents (if viewedMember is a Child)
		if (viewedMember.relationshipToHead === 'Child' && headOfHousehold) {
			if (!processedIds.has(headOfHousehold.id)) {
				const label = headOfHousehold.gender === 'Male' ? `Father` : (headOfHousehold.gender === 'Female' ? `Mother` : `Parent`);
				displayOrder.push({ member: headOfHousehold, relationLabel: `${label} (of ${viewedMember.fullName})` });
				processedIds.add(headOfHousehold.id);
			}
			if (headOfHousehold.spouseId) {
				const otherParent = householdMembers.find(m => m.id === headOfHousehold.spouseId && !processedIds.has(m.id));
				if (otherParent) {
					const label = otherParent.gender === 'Female' ? `Mother` : (otherParent.gender === 'Male' ? `Father` : `Parent`);
					displayOrder.push({ member: otherParent, relationLabel: `${label} (of ${viewedMember.fullName})` });
					processedIds.add(otherParent.id);
				}
			}
		}

		// Spouse of viewedMember
		if (viewedMember.spouseId && !processedIds.has(viewedMember.spouseId)) {
			const spouse = householdMembers.find(m => m.id === viewedMember.spouseId);
			if (spouse) {
				displayOrder.push({ member: spouse, relationLabel: `Spouse` });
				processedIds.add(spouse.id);
			}
		}

		// Children of viewedMember (if viewedMember is a head or has a spouse)
		if (viewedMember.isHouseholdHead || viewedMember.marital === 'Married') {
			 // Children are members whose householdId matches viewedMember's householdId AND relationshipToHead is 'Child'
			 // AND their parent links (if we had them) would point to viewedMember or their spouse.
			 // For simplicity now, just list children of the household head, if viewedMember is head or spouse of head.
			let childrenToList = [];
			if (effectiveHead) { // Children of the effective head of this household
				childrenToList = householdMembers.filter(m =>
					m.relationshipToHead === 'Child' &&
					m.householdId === effectiveHead.householdId && // Ensure they are in the same household as head
					!processedIds.has(m.id) && // Not already processed
					m.id !== viewedMember.id && // Not the viewed member themselves if they are a child
					(viewedMember.isHouseholdHead || (viewedMember.spouseId && viewedMember.spouseId === effectiveHead.id) || (effectiveHead.spouseId && effectiveHead.spouseId === viewedMember.id) ) // Only show children if viewed is a parent
				);
			}

			childrenToList.sort((a,b) => (new Date(a.dob) - new Date(b.dob)));
			childrenToList.forEach(child => {
				displayOrder.push({ member: child, relationLabel: `Child` });
				processedIds.add(child.id);
			});
		}

		// Siblings (if viewedMember is a Child)
		if (viewedMember.relationshipToHead === 'Child' && headOfHousehold) {
			const siblings = householdMembers.filter(m =>
				m.id !== viewedMember.id &&
				m.relationshipToHead === 'Child' &&
				!processedIds.has(m.id)
			);
			siblings.sort((a,b) => (new Date(a.dob) - new Date(b.dob)));
			siblings.forEach(sibling => {
				let label = "Sibling";
				if (sibling.gender === 'Male') label = `Brother`;
				else if (sibling.gender === 'Female') label = `Sister`;
				displayOrder.push({ member: sibling, relationLabel: label });
				processedIds.add(sibling.id);
			});
		}
		
		// Add head of household and their spouse if viewed member is one of them and they weren't added as parents
		if (viewedMember.isHouseholdHead && viewedMember.spouseId && !processedIds.has(viewedMember.spouseId)) {
			const spouseOfHead = householdMembers.find(m => m.id === viewedMember.spouseId);
			if (spouseOfHead) {
				displayOrder.push({ member: spouseOfHead, relationLabel: `Spouse` });
				processedIds.add(spouseOfHead.id);
			}
		} else if (viewedMember.relationshipToHead === 'Spouse' && headOfHousehold && !processedIds.has(headOfHousehold.id)) {
			 // Viewed member is spouse, add the head if not already processed
			displayOrder.push({ member: headOfHousehold, relationLabel: `Spouse` }); // (Spouse of viewedMember is the Head)
			processedIds.add(headOfHousehold.id);
		}


		// Add any remaining household members not yet processed
		householdMembers.forEach(m => {
			if (!processedIds.has(m.id)) {
				// Determine relationship to viewedMember if possible, otherwise generic
				let relationToViewed = m.relationshipToHead || "Household Member";
				if (m.id === effectiveHead?.spouseId && viewedMember.id === effectiveHead?.id) relationToViewed = "Spouse";
				else if (m.relationshipToHead === 'Child' && (viewedMember.isHouseholdHead || viewedMember.id === effectiveHead?.spouseId)) relationToViewed = "Child";
				// More complex relative logic can be added here if needed

				displayOrder.push({ member: m, relationLabel: relationToViewed });
				processedIds.add(m.id);
			}
		});

		if (displayOrder.length > 0) {
			displayOrder.forEach(item => {
				const m = item.member;
				listHTML += `<li>
					<strong>${m.fullName}</strong> (${item.relationLabel})<br>
					<span style="font-size:0.85em;">
						📞 ${m.phone || 'N/A'} | ✉️ ${m.email || 'N/A'} <br/>
						DOB: ${dateUtils.format(m.dob) || 'N/A'} | Age: ${dateUtils.age(m.dob) || 'N/A'}
					</span><br/>
					<button class="generic_button_styles btn_edit_member_from_family" data-id="${m.id}" style="font-size:0.8em; padding:3px 6px; margin-top:3px;">Edit</button>
				</li>`;
			});
		} else {
			// This case should ideally not be reached if viewedMember is part of a household
			listHTML += `<li>No other family members found.</li>`;
		}
		listHTML += "</ul>";

		// Use your existing showModal function
		const modal = showModal(
			`Family View: ${viewedMember.fullName}`, // Modal title focused on the viewed person
			listHTML,
			[{ label: "Close", action: (modalInstance) => modalInstance.remove() }] // Simple close button
		);

		if (modal) {
			modal.querySelectorAll('.btn_edit_member_from_family').forEach(btn => {
				btn.onclick = (e) => {
					const memberIdToEdit = e.target.dataset.id;
					modal.remove();
					this.editMember(memberIdToEdit);
				};
			});
		}
	}

//////////////////////////////////////////////////////////

		async editMember(id) {
			const member = this.members.find(m => m.id === id);
			if (!member) {
				showToast("Member not found for editing.", "error");
				return;
			}

			// Navigate to the register page (which calls loadRegister)
			document.querySelector('#mmd_tabs button[data-page="register"]')?.click();

			// Delay to allow loadRegister to complete and form to be (re)created
			setTimeout(() => {
				const form = document.getElementById('mmd_form');
				if (!form) {
					console.error("Form #mmd_form not found when trying to populate for edit.");
					showToast("Error: Could not prepare form for editing.", "error");
					return;
				}

				const profilePicInput = form.querySelector('#f_profile_pic');
				const profilePicPreview = form.querySelector('#f_profile_pic_preview');

				if (profilePicPreview) {
					if (member.profilePictureUrl) {
						profilePicPreview.src = member.profilePictureUrl;
						profilePicPreview.style.display = 'block';
					} else {
						profilePicPreview.src = '#'; // Or your defined DEFAULT_PROFILE_PIC_URL
						profilePicPreview.style.display = 'none';
					}
				}
				if (profilePicInput) {
					profilePicInput.value = null; // Clear the file input. User must re-select if they want to change.
					// The preview listener set by loadRegister will handle showing the new selection.
					// If they don't select a new file, profilePicFile will be null in submitMemberForm.
				}

				this.currentEditId = id; // Set that we are in edit mode for this member
				const submitButton = form.querySelector('button[type="submit"]');
				if (submitButton) {
					submitButton.textContent = 'Update Member Details';
				}

				// --- Common fields to populate for everyone ---
				form.f_name.value = member.fullName || '';
				form.f_dob.value = member.dob || '';
				form.f_gender.value = member.gender || 'Other';
				form.f_bapt.value = member.baptismStatus || ''; // Assuming baptismStatus from previous changes
				form.f_pos.value = member.position || 'Member';
				form.f_group.value = member.homeGroup || '';
				form.f_marital.value = member.maritalStatus || 'Single'; // Assuming maritalStatus

				// Get references to form elements that will be made conditional
				const joinDateField = form.f_join;
				const phoneField = form.f_phone;
				const emailField = form.f_email;
				const addressField = form.f_addr;

				const spouseSection = document.getElementById('spouse_section');
				const childrenSection = document.getElementById('children_section');
				const otherRelativesSection = document.getElementById('other_relatives_section');
				const childrenCountInput = form.f_children; // Assuming ID is f_children
				const otherRelativesCountInput = form.f_other_relatives_count; // Assuming ID

				if (member.isHouseholdHead) {
					// --- POPULATING AND CONFIGURING FORM FOR HEAD OF HOUSEHOLD ---
					joinDateField.value = member.joinDate || '';
					phoneField.value = member.phone || '';
					emailField.value = member.email || '';
					addressField.value = member.address || '';

					// Set fields as required for Head
					joinDateField.required = true;
					phoneField.required = true;
					emailField.required = true;
					addressField.required = true;

					// Show household management sections
					if (spouseSection) spouseSection.style.display = ''; // Reset to default display
					if (childrenSection) childrenSection.style.display = '';
					if (otherRelativesSection) otherRelativesSection.style.display = '';

					// Populate spouse details (if married)
					if (member.maritalStatus === 'Married' && member.spouseId) {
						const spouseMember = this.members.find(m => m.id === member.spouseId);
						if (spouseMember) {
							form.f_s_name.value = spouseMember.fullName || '';
							form.f_s_dob.value = spouseMember.dob || '';
							// ... populate other spouse fields (f_s_gender, f_s_join, etc.)
						}
					} else {
						// Clear spouse fields if not married or no spouse
						form.f_s_name.value = '';
						form.f_s_dob.value = '';
						// ... clear other spouse fields
					}

					// Populate children count and details (using existing logic from previous edits)
					const kidsInHousehold = this.members.filter(m => m.householdId === member.id && m.relationshipToHead === 'Child');
					if (childrenCountInput) {
						childrenCountInput.value = kidsInHousehold.length;
						childrenCountInput.dispatchEvent(new Event('input', { bubbles: true })); // To generate fields
						setTimeout(() => { // Nested timeout to populate newly generated child fields
							kidsInHousehold.forEach((child, i) => {
								const nameEl = document.getElementById(`c_name${i}`); if (nameEl) nameEl.value = child.fullName || '';
								const dobEl = document.getElementById(`c_dob${i}`); if (dobEl) dobEl.value = child.dob || '';
								// ... populate other child fields ...
							});
						}, 100);
					}
					// Populate other relatives count and details similarly if that logic exists
					if (otherRelativesCountInput) {
						// Similar logic for other relatives based on your data structure
					}

				} else {
					// --- POPULATING AND CONFIGURING FORM FOR NON-HEAD HOUSEHOLD MEMBER ---
					const head = this.members.find(h => h.id === member.householdId && h.isHouseholdHead);

					phoneField.value = member.phone || ''; // Populate if exists, but not required
					emailField.value = member.email || ''; // Populate if exists, but not required

					// For Join Date and Address, use member's own if they have one, otherwise pull from Head.
					// Make them not required.
					joinDateField.value = member.joinDate || (head ? head.joinDate : '');
					addressField.value = member.address || (head ? head.address : '');

					joinDateField.required = false;
					phoneField.required = false;
					emailField.required = false;
					addressField.required = false;

					// Optional: Add a visual cue or title that these can be inherited
					joinDateField.title = head ? `Defaults to Head's Join Date: ${dateUtils.format(head.joinDate)} if left blank.` : "Join Date (Optional)";
					addressField.title = head ? `Defaults to Head's Address: ${head.address} if left blank.` : "Address (Optional)";

					// Hide household management sections
					if (spouseSection) spouseSection.style.display = 'none';
					if (childrenSection) childrenSection.style.display = 'none';
					if (otherRelativesSection) otherRelativesSection.style.display = 'none';

					// Clear and effectively disable household structure inputs
					if (form.f_s_name) form.f_s_name.value = ''; // Clear a spouse field example
					if (childrenCountInput) {
						childrenCountInput.value = 0;
						childrenCountInput.dispatchEvent(new Event('input', { bubbles: true })); // To clear child fields
					}
					if (otherRelativesCountInput) {
						otherRelativesCountInput.value = 0;
						otherRelativesCountInput.dispatchEvent(new Event('input', { bubbles: true })); // To clear other relative fields
					}
				}

				// Ensure marital status select triggers its onchange to show/hide spouse section correctly (mostly for Head)
				if (form.f_marital && typeof form.f_marital.onchange === 'function') {
					form.f_marital.onchange();
				}
				showToast(`Editing: ${member.fullName}. ${member.isHouseholdHead ? 'Household details can be managed.' : 'Inherits some details from Head.'}`, "info", 5000);
			}, 250); // Timeout for loadRegister to complete
		}
/////////////////////////////////////////

		async deleteMember(id) {
			const member = this.members.find(m => m.id === id);
			if (!member) {
				showToast("Member not found for deletion.", "error");
				return;
			}

			// AUTOMATICALLY GET EDITOR NAME
			const editorName = this.user && this.user.displayName ? this.user.displayName : (this.user ? this.user.email : 'Unknown User');
			if (!editorName || editorName === 'Unknown User') {
				showToast("Error: User information not available. Cannot proceed with deletion.", "error");
				return;
			}
			
			const reason = prompt(`Reason for deleting ${member.fullName}:`, "N/A");
			if (reason === null) {
				showToast("Deletion cancelled.", "info");
				return;
			}
			
			toggleSpinner(true);
			const batch = db.batch();
			const memberRef = db.collection('members').doc(id);
			const deletedMemberRef = db.collection('deleted_members').doc(id);

			const deletedMemberData = {
				...member,
				deletedBy: editorName, // Use logged-in user's name
				deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
				deletionReason: reason
			};
			batch.set(deletedMemberRef, deletedMemberData);
			batch.delete(memberRef);

			let logDetails = `Deleted ${member.fullName} (ID: ${id}). Reason: ${reason}.`;

			if (member.isHouseholdHead) {
				logDetails += " Member was Head of Household. Associated members may need manual review/update.";
				// Consider if you want to automatically update/delete other household members
				// For example, unlinking them or marking them as needing a new household head.
				// This part requires careful thought based on your application's rules.
				// Example: Find other members and update their householdId or relationshipToHead.
				const householdMembersSnapshot = await db.collection('members').where('householdId', '==', id).get();
				householdMembersSnapshot.forEach(doc => {
					if (doc.id !== id) { // Don't update the member being deleted
						const otherMemberRef = db.collection('members').doc(doc.id);
						batch.update(otherMemberRef, {
							householdId: null, // Or a placeholder like 'ORPHANED'
							relationshipToHead: 'Orphaned by Head Deletion', // Or clear it
							lastEditedBy: editorName,
							lastEditedAt: firebase.firestore.FieldValue.serverTimestamp()
						});
						logDetails += ` Updated status for former household member ${doc.data().fullName}.`;
					}
				});


			} else if (member.spouseId) {
				const partnerRef = db.collection('members').doc(member.spouseId);
				batch.update(partnerRef, {
					spouseId: null,
					maritalStatus: 'Single', // Or Widowed, etc.
					lastEditedBy: editorName, // Use logged-in user's name
					lastEditedAt: firebase.firestore.FieldValue.serverTimestamp()
				});
				logDetails += ` Unlinked from former spouse (ID: ${member.spouseId}).`;
			}

			try {
				await batch.commit();
				showToast(`${member.fullName} has been deleted.`, "success");
				await this.initializeData(); // Reload all members
				logAction("Deleted Member", logDetails, reason, editorName); // Pass editorName
				
				this.filteredMembers = [...this.members];
				if (document.getElementById('page_view')?.classList.contains('active')) {
					this.renderViewContent();
				}
				if (document.getElementById('page_home')?.classList.contains('active')) { this.loadHome(); }
				if (document.getElementById('page_reminders')?.classList.contains('active')) { this.loadReminders(); }

			} catch (error) {
				console.error("Error deleting member from Firestore:", error);
				showToast("Deletion failed: " + error.message, "error");
			} finally {
				toggleSpinner(false);
			}
		}
	/////////////////////////////////////
				
	loadReminders() {
		console.log("CCC Dashboard Web App v4.4.5: Loading Reminders page...");
		const pageEl = document.getElementById('page_reminders');
		if (!pageEl) {
			console.error("Reminders page element (#page_reminders) not found.");
			showToast("Error: Reminders page UI components missing.", "error");
			return;
		}
		setElementHTML(pageEl, tpl.reminders);

		const toggleBtn = document.getElementById('toggle_reminder_view');
		const birthdayRangeSelect = document.getElementById('sel_birthday_range');
		const anniversaryRangeSelect = document.getElementById('sel_anniversary_range');

		if (toggleBtn) {
			// ... (existing toggle button logic for card/list view) ...
			toggleBtn.textContent = this.currentReminderView === 'card' ? 'Switch to List View' : 'Switch to Card View';
			toggleBtn.onclick = () => {
				this.currentReminderView = this.currentReminderView === 'card' ? 'list' : 'card';
				storage.save(REMINDER_VIEW_MODE_STORAGE_KEY, this.currentReminderView);
				toggleBtn.textContent = this.currentReminderView === 'card' ? 'Switch to List View' : 'Switch to Card View';
				this.renderReminders();
			};
		} else { console.warn("Toggle reminder view button not found in tpl.reminders."); }

		// --- NEW: Load and set saved range values ---
		if (birthdayRangeSelect) {
			const savedBirthdayRange = storage.load(REMINDER_BIRTHDAY_RANGE_KEY, '7'); // Default to 7 days if nothing saved
			birthdayRangeSelect.value = savedBirthdayRange;
			birthdayRangeSelect.addEventListener('change', (event) => {
				storage.save(REMINDER_BIRTHDAY_RANGE_KEY, event.target.value); // Save on change
				this.renderReminders();
			});
		} else { console.warn("Birthday range select #sel_birthday_range not found."); }

		if (anniversaryRangeSelect) {
			const savedAnniversaryRange = storage.load(REMINDER_ANNIVERSARY_RANGE_KEY, '30'); // Default to 30 days
			anniversaryRangeSelect.value = savedAnniversaryRange;
			anniversaryRangeSelect.addEventListener('change', (event) => {
				storage.save(REMINDER_ANNIVERSARY_RANGE_KEY, event.target.value); // Save on change
				this.renderReminders();
			});
		} else { console.warn("Anniversary range select #sel_anniversary_range not found."); }
		// --- End of new logic ---

		this.renderReminders(); // Initial render (will use the saved/default values)
	}

	renderReminders() {
		console.log("CCC Dashboard: renderReminders() called. View mode:", this.currentReminderView);
		const listBirthEl = document.getElementById('list_birth');
		const listAnniversaryEl = document.getElementById('list_anniversary');
		const birthdayRangeSelect = document.getElementById('sel_birthday_range');
		const anniversaryRangeSelect = document.getElementById('sel_anniversary_range');

		if (!listBirthEl || !listAnniversaryEl || !birthdayRangeSelect || !anniversaryRangeSelect) {
			console.error("CCC Dashboard: One or more critical elements for rendering reminders are missing.");
			showToast("Error: Reminder display elements are missing.", "error");
			return;
		}
		const birthdayRange = parseInt(birthdayRangeSelect.value);
		const anniversaryRange = parseInt(anniversaryRangeSelect.value);
        const isAdmin = this.role === 'admin'; // Check user role once

		let upcomingBirthdays = [];
		try {
			upcomingBirthdays = this.members
				.filter(m => m && m.dob) // Ensure member and dob exist
				.map(m => {
					const eventDate = dateUtils.upcomingBirthday(m.dob);
					return eventDate ? { ...m, type: 'birthday', eventDate } : null;
				})
				.filter(m => m && m.eventDate && dateUtils.inRange(m.eventDate, birthdayRange))
				.sort((a, b) => a.eventDate - b.eventDate);
		} catch (e) {
			console.error("CCC Dashboard: Error processing upcoming birthdays:", e);
			if(listBirthEl) setElementHTML(listBirthEl, "<p class='info-message'>Error loading birthday data.</p>");
		}

		let upcomingAnniversaries = [];
		try {
			upcomingAnniversaries = this.members
                .filter(m => m && m.joinDate) // Ensure member and joinDate exist
				.map(m => {
					const anni = dateUtils.upcomingAnniversary(m.joinDate);
					return anni ? { ...m, type: 'anniversary', eventDate: anni.date, years: anni.years } : null;
				})
				.filter(m => m && m.eventDate && dateUtils.inRange(m.eventDate, anniversaryRange))
				.sort((a, b) => a.eventDate - b.eventDate);
		} catch(e) {
			console.error("CCC Dashboard: Error processing upcoming anniversaries:", e);
			if(listAnniversaryEl) setElementHTML(listAnniversaryEl, "<p class='info-message'>Error loading anniversary data.</p>");
		}

		const badge = document.getElementById('badge_reminders');
		if (badge) badge.textContent = (upcomingBirthdays.length + upcomingAnniversaries.length).toString();

		const renderItems = (items, containerEl, type) => {
			if(!containerEl) { console.error(`CCC Dashboard: Container element for reminder type "${type}" not found.`); return; }
			setElementHTML(containerEl, '');
			containerEl.className = this.currentReminderView === 'card' ? 'card_view' : 'reminder-list-view';

			if (items.length === 0) {
				setElementHTML(containerEl, `<p class="info-message">No upcoming ${type}s in the selected range.</p>`); return;
			}
			items.forEach(m => {
				if (!m || !m.eventDate || !m.id) { // Added !m.id check
                    console.warn("Skipping malformed reminder item:", m);
                    return;
                }
				const reminderId = `${type}_${m.id}_${m.eventDate.toISOString().split('T')[0]}`;
				const isAcknowledged = storage.sessionLoad(REMINDER_ACK_STORAGE_KEY_PREFIX + reminderId, false);
				const ageOrYears = type === 'birthday' ? (dateUtils.age(m.dob) + 1) : m.years;
				const eventLabel = type === 'birthday' ? `Birthday: ${dateUtils.format(m.eventDate)} <br> (Turns ${ageOrYears})` : `Anniversary: ${dateUtils.format(m.eventDate)} <br> (${m.years} years)`;
                const icon = type === 'birthday' ? '🎂' : '🎉';
				const itemDiv = document.createElement('div'); itemDiv.dataset.reminderId = reminderId;
				if(isAcknowledged) itemDiv.classList.add('acknowledged');

                const imgSrc = m.profilePictureUrl || this.DEFAULT_PROFILE_PIC_URL;

                let dobOrJoinedInfoForReminder = '';
                if (type === 'birthday') {
                    if (isAdmin) {
                        dobOrJoinedInfoForReminder = `DOB: ${dateUtils.format(m.dob)}`;
                    } else {
                        dobOrJoinedInfoForReminder = 'Birthday';
                    }
                } else { // Anniversary
                    dobOrJoinedInfoForReminder = `Joined: ${dateUtils.format(m.joinDate)}`;
                }

				let itemHTML = '';
				if (this.currentReminderView === 'card') {
					itemDiv.className = `member_card ${isAcknowledged ? 'acknowledged' : ''}`;
					itemHTML = `
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                            <img src="${imgSrc}" alt="${m.fullName || ''}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 1px solid var(--sec);">
                            <h4 style="flex-grow: 1; margin: 0;">${m.fullName || 'N/A'} ${icon}</h4>
                        </div>
                        <p>${eventLabel}</p>
                        <p>📞 <a href="tel:${m.phone}" class="contact-link">${m.phone||'N/A'}</a></p>
                        <p>🏠 Group: ${m.homeGroup||'N/A'}</p>
                        <p>(${dobOrJoinedInfoForReminder})</p>
                        <div class="actions" style="margin-top:10px;">
                            <button class="btn_ack_reminder generic_button_styles" ${isAcknowledged ? 'disabled' : ''}>Acknowledge</button>
                        </div>`;
				} else { // list view
					itemDiv.className = `reminder-list-item ${isAcknowledged ? 'acknowledged' : ''}`;
					itemHTML = `
                        <img src="${imgSrc}" alt="${m.fullName || ''}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">
                        <div style="flex: 1; margin-left: 10px; font-size: 0.9rem;">
                            <strong>${m.fullName || 'N/A'}</strong> ${icon}<br> (${dobOrJoinedInfoForReminder})
                            <br>${eventLabel}<br>
                            📞 ${m.phone||'N/A'} | 🏠 ${m.homeGroup||'N/A'}
                        </div>
                        <div class="actions">
                            <button class="btn_ack_reminder generic_button_styles" ${isAcknowledged ? 'disabled' : ''}>Acknowledge</button>
                        </div>`;
                    itemDiv.style.display = 'flex';
                    itemDiv.style.alignItems = 'center';
				}
				setElementHTML(itemDiv, itemHTML);
				containerEl.appendChild(itemDiv);

				const ackButton = itemDiv.querySelector('.btn_ack_reminder');
				if (ackButton) { // Simpler check
                    if (isAcknowledged) {
                        ackButton.disabled = true;
                        ackButton.textContent = 'Acknowledged';
                    } else {
                        ackButton.onclick = () => {
                            storage.sessionSave(REMINDER_ACK_STORAGE_KEY_PREFIX + reminderId, true);
                            itemDiv.classList.add('acknowledged');
                            ackButton.disabled = true;
                            ackButton.textContent = 'Acknowledged';
                            showToast(`${m.fullName || 'Member'}'s ${type} acknowledged.`, 'success');
                        };
                    }
				}
			});
		};

		try { renderItems(upcomingBirthdays, listBirthEl, 'birthday'); } catch (e) { console.error("CCC Dashboard: Error rendering birthday items:", e); if(listBirthEl) setElementHTML(listBirthEl, "<p class='info-message'>Error displaying birthday reminders.</p>"); }
		try { renderItems(upcomingAnniversaries, listAnniversaryEl, 'anniversary'); } catch(e) { console.error("CCC Dashboard: Error rendering anniversary items:", e); if(listAnniversaryEl) setElementHTML(listAnniversaryEl, "<p class='info-message'>Error displaying anniversary reminders.</p>"); }
		console.log("CCC Dashboard: renderReminders() completed.");
	}

//////////////////////////////////////////

	applyFiltersAndSearch() {
        console.log("CCC Dashboard: applyFiltersAndSearch called. Total members:", this.members ? this.members.length : 'N/A');
		const searchTermElement = document.getElementById('member_search_input');
		const groupFilterElement = document.getElementById('member_filter_group');
		const positionFilterElement = document.getElementById('member_filter_position');
		const genderFilterElement = document.getElementById('member_filter_gender');
		const maritalFilterElement = document.getElementById('member_filter_marital');

		const searchTerm = searchTermElement ? searchTermElement.value.toLowerCase().trim() : '';
		const filterGroup = groupFilterElement ? groupFilterElement.value : '';
		const filterPosition = positionFilterElement ? positionFilterElement.value : '';
		const filterGender = genderFilterElement ? genderFilterElement.value : '';
		const filterMarital = maritalFilterElement ? maritalFilterElement.value : '';

        if (!this.members || !Array.isArray(this.members)) {
            console.error("CCC Dashboard: this.members is not available or not an array in applyFiltersAndSearch!");
            this.filteredMembers = [];
        } else {
            this.filteredMembers = this.members.filter(member => {
                if (!member) return false; // Should not happen if data is clean

                const nameMatch = member.fullName ? member.fullName.toLowerCase().includes(searchTerm) : false;
                const emailMatch = member.email ? member.email.toLowerCase().includes(searchTerm) : false;
                const phoneMatch = member.phone ? member.phone.toLowerCase().includes(searchTerm) : false;
                const addressMatch = member.address ? member.address.toLowerCase().includes(searchTerm) : false;
                const idMatch = member.id ? member.id.toLowerCase().includes(searchTerm) : false;

                const matchesSearch = searchTerm === '' || nameMatch || emailMatch || phoneMatch || addressMatch || idMatch;
                const matchesGroup = filterGroup === '' || (member.homeGroup || 'Unknown') === filterGroup;
                const matchesPosition = filterPosition === '' || member.position === filterPosition;
                const matchesGender = filterGender === '' || member.gender === filterGender;
                const matchesMarital = filterMarital === '' || member.maritalStatus === filterMarital;

                return matchesSearch && matchesGroup && matchesPosition && matchesGender && matchesMarital;
            });
        }

		console.log(`CCC Dashboard: applyFiltersAndSearch - Found ${this.filteredMembers.length} members after filtering.`);
        console.log("CCC Dashboard: applyFiltersAndSearch - Calling renderViewContent.");
		this.renderViewContent();
	}

		// --- IMPORT / EXPORT Tab ---
	loadImportExport() {
		console.log("CCC Dashboard Web App v4.4.5: Loading Import/Export page...");
		const pageEl = document.getElementById('page_importExport');
		if (!pageEl) {
			console.error("Import/Export page element (#page_importExport) not found.");
			showToast("Error: Import/Export page UI components missing.", "error");
			return;
		}
		setElementHTML(pageEl, tpl.importExport);

		// Export JSON
		const exportJsonBtn = document.getElementById('export_json_btn');
		if (exportJsonBtn) {
			exportJsonBtn.addEventListener('click', () => {
				const allData = {
					members: this.members,
					deletedMembers: this.deletedMembers,
					auditLog: getAudit(),
					settings: {
						theme: storage.load(THEME_STORAGE_KEY, 'light'), // Use storage.load
						viewMode: storage.load(VIEW_MODE_STORAGE_KEY, 'card'),
						reminderViewMode: storage.load(REMINDER_VIEW_MODE_STORAGE_KEY, 'card')
					},
					exportDate: new Date().toISOString()
				};
				const jsonData = JSON.stringify(allData, null, 2);
				const blob = new Blob([jsonData], { type: 'application/json' });
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `ccc_dashboard_backup_${new Date().toISOString().split('T')[0]}.json`;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
				showToast("Data exported to JSON.", "success");
			});
		} else { console.warn("#export_json_btn not found."); }

		// Export Members CSV
		const exportCsvBtn = document.getElementById('export_members_csv_btn');
		if (exportCsvBtn) {
			exportCsvBtn.addEventListener('click', () => {
				if (this.members.length === 0) {
					showToast("No members to export.", "info");
					return;
				}
				const headers = ["ID", "Household ID", "Is Head", "Relationship To Head", "Spouse ID", "Full Name", "DOB", "Gender", "Joined", "Phone", "Email", "Address", "Baptism", "Position", "Home Group", "Marital Status"];
				const csvRows = [headers.join(',')];

				this.members.forEach(m => {
					const row = [
						m.id || '', m.householdId || '', m.isHouseholdHead || false, m.relationshipToHead || '', m.spouseId || '',
						m.fullName || '', m.dob || '', m.gender || '',
                        // ================= FIX: Use m.joinDate =================
                        m.joinDate || '', // <--- Use joinDate here
                        // =======================================================
                        m.phone || '', m.email || '',
						m.address ? `"${m.address.replace(/"/g, '""')}"` : '', // Use m.address
						m.baptismStatus || '', m.position || '', m.homeGroup || '', m.maritalStatus || '' // Use m.maritalStatus and m.baptismStatus
					];
					csvRows.push(row.map(val => typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : `"${val}"`).join(','));
				});
                // ... (rest of CSV export logic) ...
                const csvData = csvRows.join('\n');
				const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `ccc_members_export_${new Date().toISOString().split('T')[0]}.csv`;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
				showToast("Members exported to CSV.", "success");
			});
		} else { console.warn("#export_members_csv_btn not found."); }

		// Export PDF (Guide)
		const exportPdfBtn = document.getElementById('export_pdf_btn');
		if (exportPdfBtn) {
			exportPdfBtn.addEventListener('click', () => {
				showModal("PDF Export Guide", `
					<p>To export member data as a PDF:</p>
					<ol>
						<li>Go to the "View Members" tab.</li>
						<li>Switch to "Table View" if you are not already in it.</li>
						<li>Apply any filters you need (or clear them to show all members).</li>
						<li>Use your browser's "Print" function (usually Ctrl+P or Cmd+P).</li>
						<li>In the print dialog, choose "Save as PDF" or "Microsoft Print to PDF" as the printer/destination.</li>
						<li>Adjust layout options (like "Landscape" orientation, "Fit to page/width", margins) in the print preview for the best result.</li>
						<li>Click "Save".</li>
					</ol>
					<p>This method uses your browser's built-in PDF generation capabilities.</p>
				`);
			});
		} else { console.warn("#export_pdf_btn not found."); }

		// Import JSON
		const fileInput = document.getElementById('import_json_file_input');
		const fileNameSpan = document.getElementById('json_file_name_display');
		const importJsonDataBtn = document.getElementById('import_json_data_btn');

		if (fileInput && fileNameSpan) {
			fileInput.addEventListener('change', (event) => {
				if (event.target.files.length > 0) {
					fileNameSpan.textContent = event.target.files[0].name;
				} else {
					fileNameSpan.textContent = "No file chosen";
				}
			});
		} else { console.warn("#import_json_file_input or #json_file_name_display not found."); }

		if (importJsonDataBtn && fileInput) {
			importJsonDataBtn.addEventListener('click', async () => {
				if (fileInput.files.length === 0) {
					showToast("Please choose a JSON file to import.", "error");
					return;
				}
				const editorName = this.user && this.user.displayName ? this.user.displayName : (this.user ? this.user.email : 'Unknown User'); // USE THIS
				if (!editorName || editorName === 'Unknown User') {
					showToast("User information not found. Cannot proceed with import.", "error");
					// Potentially stop the import process
					return; 
				}

				const file = fileInput.files[0];
				const reader = new FileReader();
				reader.onload = (e_reader) => {
					try {
						const importedData = JSON.parse(e_reader.target.result);
						if (!importedData.members || importedData.auditLog === undefined) { // auditLog can be empty array
							showToast("Invalid JSON backup file structure. 'members' and 'auditLog' are required.", "error");
							return;
						}
						
						// Confirmation Modal
						const confirmMsg = `Are you sure you want to import data from "${file.name}"? This will overwrite all current members, deleted members, audit logs, and settings. This action cannot be undone.`;
						showModal("Confirm Data Import", `<p>${confirmMsg}</p>`, [
							{
								label: "Yes, Overwrite and Import",
								className: "generic_button_styles danger",
								action: (modalInstance) => {
									modalInstance.remove(); // Close this modal first

									this.members = importedData.members || [];
									this.deletedMembers = importedData.deletedMembers || [];
									const audit = importedData.auditLog || [];

									saveMembers(this.members);
									saveDeletedMembers(this.deletedMembers);
									saveAudit(audit);

									if (importedData.settings) {
										storage.save(THEME_STORAGE_KEY, importedData.settings.theme || 'light');
										storage.save(VIEW_MODE_STORAGE_KEY, importedData.settings.viewMode || 'card');
										storage.save(REMINDER_VIEW_MODE_STORAGE_KEY, importedData.settings.reminderViewMode || 'card');
										
										// Apply theme immediately
										const newTheme = storage.load(THEME_STORAGE_KEY, 'light');
										document.documentElement.classList.toggle('dark', newTheme === 'dark');
										const themeToggleBtn = document.getElementById('theme_toggle');
										if(themeToggleBtn) themeToggleBtn.textContent = newTheme === 'dark' ? '🌙' : '☀️';
									}

									logAction("Data Imported", `All data imported from file: ${file.name} by ${editor}`, '', editor);
									showToast("Data imported successfully! Reloading dashboard...", "success");
									
									// Full refresh to ensure all states are reset and UI reflects new data/settings
									setTimeout(() => window.location.reload(), 1500);
								}
							},
							{
								label: "Cancel Import",
								action: (modalInstance) => {
									modalInstance.remove();
									showToast("Import cancelled by user.", "info");
								}
							}
						]);

					} catch (err) {
						console.error("Error parsing or importing JSON:", err);
						showToast("Error importing JSON. File might be corrupted or not valid JSON.", "error");
					}
				};
				reader.readAsText(file);
			});
		} else { console.warn("#import_json_data_btn or #import_json_file_input not found."); }
		console.log("CCC Dashboard Web App v4.4.5: Import/Export page loaded.");
	}
        //////////////////////////////

		async loadAudit() {
			const pageEl = document.getElementById('page_audit');
			if (!pageEl) {
				console.error("Audit page element #page_audit not found.");
				if (auth) auth.signOut(); // Critical error, sign out
				return;
			}
			if (!db) {
				setElementHTML(pageEl, "<p class='info-message'>Error: Database service is not available.</p>");
				return;
			}

			try {
				const auditSnapshot = await db.collection('audit_logs')
											.orderBy('timestamp', 'desc')
											.limit(300) // Keep existing limit
											.get();
				const auditLogs = auditSnapshot.docs.map(doc => {
					const data = doc.data();
					// Ensure timestamp is a Date object for toLocaleString() in the template
					const timestamp = data.timestamp && data.timestamp.toDate ? data.timestamp.toDate() : (data.timestamp ? new Date(data.timestamp) : new Date());
					return {
						...data,
						ts: timestamp // overwrite with Date object for template compatibility
					};
				});
				// Ensure tpl.audit expects 'ts' as a Date object, or adjust here.
				// Original tpl.audit: new Date(l.ts).toLocaleString()
				// If l.ts is now already a Date object, this is fine.
				setElementHTML(pageEl, tpl.audit(auditLogs));
				if (window.Tablesort && pageEl.querySelector('table#mmd_table')) {
					 // Check if an instance already exists to avoid errors if re-sorting
					if (!pageEl.querySelector('table#mmd_table').tablesortInstance) {
						pageEl.querySelector('table#mmd_table').tablesortInstance = new Tablesort(pageEl.querySelector('table#mmd_table'));
					} else {
						// If you need to update after content change, some libraries have a refresh method
						// For Tablesort, you might need to call tablesortInstance.refresh() or re-initialize
						// For now, we only initialize if no instance exists.
					}
				}
			} catch (error) {
				console.error("Error loading audit logs from Firestore:", error);
				setElementHTML(pageEl, "<p class='info-message'>Error loading audit logs. Please check the console.</p>");
			}
		}

//////////////////////


_showFamilyModal(householdId) { // householdId can be the actual householdId or a memberId if they are the head/single
            if (!this.members || !Array.isArray(this.members)) {
              showToast("Members list is not ready for family view.", "error");
              return;
            }

            // Find all members belonging to this household key
            // A member belongs if their householdId matches OR if they are the head and their id matches householdId (for single-person households)
            const familyMembers = this.members.filter(m => m.householdId === householdId || m.id === householdId);

            if (familyMembers.length === 0) {
                showModal("Family View", "<p>No members found for this household ID.</p>");
                return;
            }

            // Determine the head member for display purposes
            const headMember = familyMembers.find(m => m.isHouseholdHead && m.id === householdId) || // Explicit head
                               familyMembers.find(m => m.isHouseholdHead) || // Any head in the group
                               familyMembers.find(m => m.id === householdId && !m.householdId) || // Single person
                               familyMembers[0]; // Fallback to first member

            let listHTML = `<h4>Family of ${headMember ? headMember.fullName : 'Selected Household'}</h4><ul style="list-style: none; padding: 0; max-height: 60vh; overflow-y: auto;">`;
            const isAdmin = this.role === 'admin';

            const roleOrder = { 'Head': 1, 'Spouse': 2, 'Child': 3 }; // For sorting
            function getBadge(role) { /* ... (keep your getBadge function) ... */
                const badgeMap = { "Head": "👑 Head", "Spouse": "💍 Spouse", "Child": "👶 Child", "Sibling": "🧑‍🤝‍🧑 Sibling", "Other Relative": "👤 Relative", "Household Member": "👤 Member", "Member": "👤 Member" };
                return badgeMap[role] || `👤 ${role}`;
            }


            familyMembers.sort((a, b) => {
              const roleAOrder = roleOrder[a.relationshipToHead] || (a.isHouseholdHead ? 0 : 4);
              const roleBOrder = roleOrder[b.relationshipToHead] || (b.isHouseholdHead ? 0 : 4);
              if (roleAOrder !== roleBOrder) return roleAOrder - roleBOrder;
              if (a.dob && b.dob) return new Date(a.dob) - new Date(b.dob);
              return (a.fullName || '').localeCompare(b.fullName || '');
            }).forEach(m => {
              let role = m.relationshipToHead || "Member";
              // Ensure head is displayed as Head if they are the primary key for the household
              if (m.id === householdId && m.isHouseholdHead) role = "Head";
              else if (m.isHouseholdHead) role = "Head"; // General case if iterating actual household

              let dobInFamilyModal = '';
              if (isAdmin) {
                  dobInFamilyModal = `DOB: ${dateUtils.format(m.dob) || 'N/A'} | `;
              }

              listHTML += `
                <li style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; border-bottom: 1px solid var(--sec); padding-bottom: 10px;">
                  <img src="${m.profilePictureUrl || this.DEFAULT_PROFILE_PIC_URL}" alt="${m.fullName || ''}'s photo" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 2px solid var(--sec);">
                  <div style="flex-grow: 1;">
                    <strong>${m.fullName || 'N/A'}</strong> <span style="font-size: 0.8em; color: var(--fg-muted);">(${getBadge(role)})</span><br>
                    <span style="font-size: 0.85em;">
                      📞 ${m.phone || 'N/A'} | ✉️ ${m.email || 'N/A'}<br>
                      ${dobInFamilyModal}Age: ${dateUtils.age(m.dob) || 'N/A'}
                    </span><br/>
                    <button class="generic_button_styles btn_edit_member_from_family" data-id="${m.id}" style="font-size:0.8em; padding:3px 6px; margin-top:4px;">Edit</button>
                  </div>
                </li>`;
            });
            listHTML += "</ul>";

            const modal = showModal(`Family View: ${headMember ? headMember.fullName + "'s Household" : 'Household'}`, listHTML);
            if (modal) {
                modal.querySelectorAll('.btn_edit_member_from_family').forEach(btn => {
                    btn.onclick = (e) => {
                        const memberIdToEdit = e.target.dataset.id;
                        modal.remove();
                        this.editMember(memberIdToEdit);
                    };
                });
            }
        }
	
	}

	
		const dashboard = new Dashboard();
window.dashboardInstance = dashboard;
	
	
	}); 
		
					// Instantiate and start the application
	// End DOMContentLoaded	
	


document.addEventListener('click', function(e) {
  if (e.target.classList.contains('toggle-details-btn')) {
    const card = e.target.closest('.member-card');
    if (card) {
      card.classList.toggle('expanded');
      e.target.textContent = card.classList.contains('expanded') ? '▲ Hide Details' : '▼ Show More';
    }
  }
	});

/////////////////////////////////////////
//   for profile picture animation 
document.addEventListener('DOMContentLoaded', function () {
  const zoomOverlay = document.getElementById('zoom_modal_overlay');
  const zoomImage = zoomOverlay.querySelector('img');
  const closeBtn = document.getElementById('close_zoom_btn');

  function openModal(src) {
    zoomImage.src = src;
    zoomOverlay.style.display = 'flex';
    requestAnimationFrame(() => zoomOverlay.classList.add('show'));
  }

  function closeModal() {
    zoomOverlay.classList.remove('show');
    setTimeout(() => {
      zoomOverlay.style.display = 'none';
    }, 300);
  }

  document.addEventListener('click', function (e) {
    if (e.target.classList.contains('member_profile_pic')) {
      openModal(e.target.src);
    }
  });

  closeBtn.addEventListener('click', closeModal);

  zoomOverlay.addEventListener('click', function (e) {
    if (e.target.id === 'zoom_modal_overlay') closeModal();
  });

  let touchStartX = 0;
  let touchEndX = 0;

  zoomOverlay.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
  });

  zoomOverlay.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    if (Math.abs(touchStartX - touchEndX) > 80) closeModal();
  });
});
