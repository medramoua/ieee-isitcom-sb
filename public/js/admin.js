(() => {
  const root = document.getElementById("admin-root");
  const path = location.pathname.replace(/\/+$/, "") || "/admin";
  const params = new URLSearchParams(location.search);
  const route = path === "/admin.html" ? "/admin" : path;
  const contentRoute = route.match(/^\/admin\/content\/(events|news|projects)(?:\/([^/]+))?(?:\/(new))?$/);
  const callbackUrl = params.get("callbackUrl");
  const localeKey = "ieee-admin-locale";
  const localeParam = params.get("locale");
  if (localeParam === "fr" || localeParam === "en") localStorage.setItem(localeKey, localeParam);
  let locale = localeParam === "fr" || localeParam === "en"
    ? localeParam
    : localStorage.getItem(localeKey) === "en" ? "en" : "fr";
  const englishText = new Map(Object.entries({
    "Administration | IEEE ISITCom": "Administration | IEEE ISITCom",
    "Cette interface nécessite JavaScript pour afficher les données et envoyer les formulaires.": "This interface requires JavaScript to display data and submit forms.",
    "Connexion": "Sign in",
    "Espace réservé aux membres du bureau.": "Restricted to branch officers.",
    "Email": "Email",
    "Mot de passe": "Password",
    "Mot de passe oublié ?": "Forgot password?",
    "Se connecter": "Sign in",
    "Email ou mot de passe incorrect.": "Incorrect email or password.",
    "Compte verrouillé 15 minutes après trop d'échecs.": "Account locked for 15 minutes after too many failed attempts.",
    "Trop de tentatives. Réessayez dans quelques minutes.": "Too many attempts. Try again in a few minutes.",
    "Connexion impossible. Réessayez.": "Unable to sign in. Please try again.",
    "Une erreur est survenue.": "Something went wrong.",
    "Mot de passe oublié": "Forgot password",
    "Entrez votre email, nous vous envoyons un lien de réinitialisation.": "Enter your email and we will send you a password reset link.",
    "Retour à la connexion": "Back to sign in",
    "Envoyer le lien": "Send link",
    "Si un compte correspond à cet email, un lien de réinitialisation vient d’être envoyé (valable 1 heure).": "If an account matches this email, a reset link has been sent (valid for 1 hour).",
    "Nouveau mot de passe": "New password",
    "Lien de réinitialisation invalide.": "Invalid reset link.",
    "Lien invalide. Refaites une demande de réinitialisation.": "Invalid link. Request a new password reset.",
    "Retour": "Back",
    "12 caractères minimum, avec au moins une lettre et un chiffre.": "At least 12 characters, including one letter and one number.",
    "Confirmer": "Confirm password",
    "Enregistrer": "Save",
    "Mot de passe mis à jour. Connectez-vous.": "Password updated. Please sign in.",
    "Changer le mot de passe": "Change password",
    "Pour des raisons de sécurité, choisissez un nouveau mot de passe avant de continuer.": "For security, choose a new password before continuing.",
    "Mot de passe actuel": "Current password",
    "Déconnexion": "Sign out",
    "Navigation d’administration": "Admin navigation",
    "Tableau de bord": "Dashboard",
    "Événements": "Events",
    "Actualités": "News",
    "Projets": "Projects",
    "Administrateurs": "Administrators",
    "Gestion des administrateurs": "Admin management",
    "Créer un administrateur": "Create an administrator",
    "Créez le compte Admin et choisissez un mot de passe temporaire. L’administrateur devra le changer à sa première connexion.": "Create the Admin account and choose a temporary password. The administrator must change it at first sign-in.",
    "Nom complet": "Full name",
    "Mot de passe temporaire": "Temporary password",
    "Confirmer le mot de passe": "Confirm password",
    "12 caractères minimum, avec au moins une lettre et un chiffre.": "At least 12 characters, including one letter and one number.",
    "Compte administrateur créé. Il devra changer son mot de passe à sa première connexion.": "Admin account created. They must change their password at first sign-in.",
    "Créer le compte": "Create account",
    "Administrateurs existants": "Existing administrators",
    "Nom": "Name",
    "État": "Status",
    "Actif": "Active",
    "Inactif": "Inactive",
    "Créé le": "Created",
    "Dernière connexion": "Last sign-in",
    "Jamais": "Never",
    "Aucun administrateur pour le moment.": "No administrators yet.",
    "Adresse email déjà utilisée.": "That email address is already in use.",
    "Un compte existe déjà avec cette adresse email.": "An account already exists with this email address.",
    "L’envoi des emails n’est pas configuré.": "Email delivery is not configured.",
    "Photos, équipe & partenaires": "Photos, team & partners",
    "Bonjour": "Hello",
    "Voici un aperçu du contenu de la branche.": "Here is an overview of branch content.",
    "Enregistrés dans le site": "Published on the site",
    "Contenu de la page d’accueil": "Homepage content",
    "Photos de la galerie": "Gallery photos",
    "Ajoutez des photos visibles sur la page d’accueil. Les administrateurs peuvent déposer une image directement ici.": "Add photos to display on the homepage. Admins can drop images here.",
    "Ajouter une photo": "Add a photo",
    "Déposez une photo ici": "Drop a photo here",
    "JPEG, PNG, WebP ou GIF · 8 Mo maximum": "JPEG, PNG, WebP, or GIF · 8 MB maximum",
    "Choisir une photo": "Choose a photo",
    "Aperçu de la photo": "Photo preview",
    "Aucune photo dans la galerie.": "No photos in the gallery.",
    "Équipe actuelle": "Current team",
    "Nom complet *": "Full name *",
    "Fonction (français) *": "Position (French) *",
    "Position (English)": "Position (English)",
    "Présentation (français)": "Biography (French)",
    "Biography (English)": "Biography (English)",
    "Photo de la personne (facultatif)": "Person's photo (optional)",
    "Ajouter à l’équipe": "Add to team",
    "Aucun membre d’équipe publié.": "No team members published.",
    "Partenaires & sponsors": "Partners & sponsors",
    "Jalons de la branche": "Branch milestones",
    "Ajoutez les dates importantes et les réussites de la branche.": "Add important dates and achievements for the branch.",
    "Date *": "Date *",
    "Titre (français) *": "Title (French) *",
    "Titre (anglais)": "Title (English)",
    "Description (français)": "Description (French)",
    "Ajouter un jalon": "Add milestone",
    "Aucun jalon ajouté.": "No milestones added.",
    "Jalon ajouté.": "Milestone added.",
    "Nom du partenaire *": "Partner name *",
    "Site web": "Website",
    "Description (English)": "Description (English)",
    "Logo (facultatif)": "Logo (optional)",
    "Ajouter un partenaire": "Add partner",
    "Aucun partenaire enregistré.": "No partners added.",
    "Photo": "Photo",
    "Supprimer": "Delete",
    "Membre ajouté à l’équipe.": "Team member added.",
    "Partenaire ajouté.": "Partner added.",
    "Supprimer cet élément du site ?": "Delete this item from the site?",
    "Élément supprimé.": "Item deleted.",
    "Aucune photo": "No photo",
    "Gestion du contenu": "Content management",
    "Aucun contenu pour le moment.": "No content yet.",
    "Créer un événement": "Create event",
    "Créer une actualité": "Create news post",
    "Créer un projet": "Create project",
    "Titre": "Title",
    "Statut": "Status",
    "Modifié": "Last updated",
    "Actions": "Actions",
    "Modifier": "Edit",
    "Créer un contenu": "Create content",
    "Modifier le contenu": "Edit content",
    "Nouvel événement": "New event",
    "Nouvelle actualité": "New news post",
    "Nouveau projet": "New project",
    "Slug URL *": "URL slug *",
    "Minuscules, chiffres et tirets. Exemple : journee-robotique-2026": "Lowercase letters, numbers, and hyphens. Example: robotics-day-2026",
    "Titre *": "Title *",
    "Extrait": "Excerpt",
    "Résumé": "Summary",
    "Contenu": "Content",
    "Description": "Description",
    "Brouillon": "Draft",
    "À réviser": "In review",
    "Publié / programmé": "Published / scheduled",
    "Archivé": "Archived",
    "Début *": "Starts *",
    "Fin": "Ends",
    "Saisissez la date et l’heure locales de Tunis. Le compte à rebours s’affichera automatiquement sur la page Événements.": "Enter the local date and time for Tunis. The countdown will appear automatically on the Events page.",
    "Présentiel": "In person",
    "En ligne": "Online",
    "Hybride": "Hybrid",
    "Lieu": "Location",
    "Avancement": "Stage",
    "Idée": "Idea",
    "En cours": "In progress",
    "Terminé": "Completed",
    "Technologies": "Technologies",
    "Date de publication (optionnelle)": "Publication date (optional)",
    "Une date future programme la publication.": "A future date schedules publication.",
    "Annuler": "Cancel",
    "Créer un": "Create ",
    "Photo de couverture (facultatif)": "Cover image (optional)",
    "Retirer la photo": "Remove photo",
    "Choisissez une image JPEG, PNG, WebP ou GIF de 8 Mo maximum.": "Choose a JPEG, PNG, WebP, or GIF image up to 8 MB.",
    "Envoi de la photo…": "Uploading photo…",
    "Photo envoyée. Enregistrez le formulaire pour l’ajouter au contenu.": "Photo uploaded. Save the form to add it to the content.",
    "La photo n’a pas pu être envoyée.": "Could not upload the photo.",
    "La photo sera retirée du contenu après l’enregistrement.": "The photo will be removed from the content after saving.",
    "Supprimer définitivement cet élément ?": "Permanently delete this item?",
    "Erreur": "Error",
    "Accès refusé.": "Access denied.",
    "Date de début de l’événement obligatoire.": "The event start date is required.",
    "Photo ajoutée à la galerie.": "Photo added to the gallery.",
    "Photo prête. Enregistrez le formulaire pour publier.": "Photo ready. Save the form to publish.",
  }));
  const localizeText = (text) => {
    const trimmed = text.trim();
    let translated = englishText.get(trimmed);
    if (!translated && locale === "en") {
      const status = trimmed.match(/^Bonjour (.+)$/);
      if (status) translated = `Hello ${status[1]}`;
      else if (trimmed === "Créer un" || trimmed === "Créer une") translated = "Create";
    }
    return translated === undefined ? text : text.replace(trimmed, translated);
  };
  const localizeTree = (node) => {
    if (locale !== "en") return;
    if (node.nodeType === Node.TEXT_NODE) {
      const original = node.textContent;
      const translated = localizeText(original);
      if (translated !== original) node.textContent = translated;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      for (const attribute of ["aria-label", "placeholder", "title", "alt"]) {
        if (!node.hasAttribute(attribute)) continue;
        const original = node.getAttribute(attribute);
        const translated = localizeText(original);
        if (translated !== original) node.setAttribute(attribute, translated);
      }
      node.childNodes.forEach(localizeTree);
    }
  };
  const languageSwitch = () => `<div class="admin-language-switch" aria-label="Language"><button type="button" data-admin-locale="fr" aria-pressed="${locale === "fr"}">FR</button><button type="button" data-admin-locale="en" aria-pressed="${locale === "en"}">EN</button></div>`;
  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-admin-locale]");
    if (!button) return;
    localStorage.setItem(localeKey, button.dataset.adminLocale);
    const next = new URL(location.href);
    next.searchParams.set("locale", button.dataset.adminLocale);
    location.assign(next);
  });
  const translationObserver = new MutationObserver((records) => {
    if (locale !== "en") return;
    records.forEach((record) => {
      if (record.type === "characterData") localizeTree(record.target);
      record.addedNodes?.forEach(localizeTree);
    });
  });
  translationObserver.observe(root, { childList: true, characterData: true, subtree: true });
  document.documentElement.lang = locale;
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
  const showToast = (message, error = false) => {
    const toast = document.createElement("div");
    toast.className = `toast${error ? " error" : ""}`;
    toast.setAttribute("role", error ? "alert" : "status");
    toast.textContent = message;
    document.body.append(toast);
    setTimeout(() => toast.remove(), 4000);
  };
  const api = async (url, options) => {
    const response = await fetch(url, { credentials: "same-origin", ...options });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Une erreur est survenue.");
    return data;
  };
  const formField = (id, label, type = "text", value = "", attrs = "") =>
    `<div class="field"><label for="${id}">${label}</label><input id="${id}" name="${id}" type="${type}" value="${escapeHtml(value)}" ${attrs}></div>`;
  const renderUsersManager = async () => {
    const data = await api("/api/admin/users");
    const date = (value) => value
      ? new Intl.DateTimeFormat(locale === "fr" ? "fr-TN" : "en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
      : "Jamais";
    const rows = data.users.length
      ? data.users.map((user) => `<tr><td>${escapeHtml(user.name)}</td><td>${escapeHtml(user.email)}</td><td>${user.isActive ? "Actif" : "Inactif"}</td><td>${escapeHtml(date(user.createdAt))}</td><td>${escapeHtml(date(user.lastLoginAt))}</td></tr>`).join("")
      : '<tr><td colspan="5" class="empty-row">Aucun administrateur pour le moment.</td></tr>';
    document.getElementById("panel-content").innerHTML = `<div class="page-heading"><div><p class="page-kicker">Gestion des administrateurs</p><h1>Administrateurs</h1></div></div><section class="panel-card"><h2>Créer un administrateur</h2><p class="field-hint">Créez le compte Admin et choisissez un mot de passe temporaire. L’administrateur devra le changer à sa première connexion.</p><form id="admin-user-form" class="content-form"><div class="form-grid">${formField("name", "Nom complet", "text", "", 'required maxlength="120" autocomplete="name"')}${formField("email", "Email", "email", "", 'required maxlength="254" autocomplete="email"')}${formField("password", "Mot de passe temporaire", "password", "", 'required minlength="12" maxlength="128" autocomplete="new-password"')}<p class="field-hint">12 caractères minimum, avec au moins une lettre et un chiffre.</p>${formField("confirm", "Confirmer le mot de passe", "password", "", 'required minlength="12" maxlength="128" autocomplete="new-password"')}</div><p id="form-error" class="form-error" role="alert" hidden></p><button id="create-admin" class="button" type="submit">Créer le compte</button></form></section><section class="panel-card table-wrap"><h2>Administrateurs existants</h2><table><thead><tr><th>Nom</th><th>Email</th><th>État</th><th>Créé le</th><th>Dernière connexion</th></tr></thead><tbody>${rows}</tbody></table></section>`;
    document.getElementById("admin-user-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = document.getElementById("create-admin");
      const error = document.getElementById("form-error");
      error.hidden = true;
      button.disabled = true;
      try {
        const payload = Object.fromEntries(new FormData(form));
        const result = await api("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        showToast("Compte administrateur créé. Il devra changer son mot de passe à sa première connexion.");
        await renderUsersManager();
      } catch (reason) {
        error.textContent = reason.message || "Une erreur est survenue.";
        error.hidden = false;
      } finally {
        if (document.body.contains(button)) button.disabled = false;
      }
    });
  };
  const imageUploader = (value) => `<div class="field image-field"><label for="coverImageFile">Photo de couverture (facultatif)</label><input id="coverImage" name="coverImage" type="hidden" value="${escapeHtml(value.coverImage)}"><input id="coverImageFile" class="image-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif"><div id="image-dropzone" class="image-dropzone"><strong>Déposez une photo ici</strong><span>JPEG, PNG, WebP ou GIF · 8 Mo maximum</span><button id="choose-image" class="button secondary" type="button">Choisir une photo</button></div><p id="image-status" class="field-hint" aria-live="polite"></p><p id="image-error" class="form-error image-error" role="alert" hidden></p><div id="image-preview" class="image-preview"${value.coverImageUrl ? "" : " hidden"}><img id="image-preview-img" src="${escapeHtml(value.coverImageUrl || "")}" alt="Aperçu de la photo"><button id="remove-image" class="button secondary" type="button">Retirer la photo</button></div></div>`;
  const authPage = (title, description, fields, footer, submitLabel, onSubmit) => {
    root.innerHTML = `${languageSwitch()}<main class="auth-page"><div class="auth-wrap"><div class="auth-brand"><span class="auth-logo">IEEE</span><span>IEEE ISITCom</span></div><section class="auth-card"><h1>${title}</h1><p class="auth-description">${description}</p><form id="auth-form" novalidate>${fields}<p id="form-error" class="form-error" role="alert" hidden></p><p id="form-success" class="form-success" role="status" hidden></p><button class="button full" type="submit">${submitLabel}</button></form></section><div class="auth-footer">${footer}</div></div></main>`;
    document.getElementById("auth-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector("button[type=submit]");
      const error = document.getElementById("form-error");
      error.hidden = true;
      button.disabled = true;
      try {
        await onSubmit(new FormData(form), form);
      } catch (reason) {
        error.textContent = reason.message || "Une erreur est survenue.";
        error.hidden = false;
      } finally {
        if (document.body.contains(button)) button.disabled = false;
      }
    });
  };
  const authAction = async (action, values) => api(`/api/admin/auth/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });

  const renderLogin = () => {
    const safeCallback = callbackUrl && callbackUrl.startsWith("/admin") && !callbackUrl.startsWith("//") ? callbackUrl : "/admin";
    authPage("Connexion", "Espace réservé aux membres du bureau.", `${formField("email", "Email", "email", "", 'autocomplete="username" required')}${formField("password", "Mot de passe", "password", "", 'autocomplete="current-password" required')}`,
      '<a href="/admin/forgot-password">Mot de passe oublié ?</a>', "Se connecter", async (form) => {
        const csrfResponse = await fetch("/api/auth/csrf", { credentials: "same-origin" });
        if (!csrfResponse.ok) throw new Error("Connexion impossible. Réessayez.");
        const { csrfToken } = await csrfResponse.json();
        const body = new URLSearchParams({
          csrfToken,
          email: form.get("email"),
          password: form.get("password"),
          callbackUrl: safeCallback,
          json: "true",
        });
        const response = await fetch("/api/auth/callback/credentials", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        });
        const result = await response.json();
        const destination = new URL(result.url, location.origin);
        if (destination.searchParams.has("error")) {
          const code = destination.searchParams.get("error");
          const messages = {
            CredentialsSignin: "Email ou mot de passe incorrect.",
            LOCKED: "Compte verrouillé 15 minutes après trop d'échecs.",
            TOO_MANY_ATTEMPTS: "Trop de tentatives. Réessayez dans quelques minutes.",
          };
          throw new Error(messages[code] || "Connexion impossible. Réessayez.");
        }
        location.assign(safeCallback);
      });
  };

  const renderForgot = () => authPage("Mot de passe oublié", "Entrez votre email, nous vous envoyons un lien de réinitialisation.",
    `${formField("email", "Email", "email", "", 'autocomplete="email" required')}`,
    '<a href="/admin/login">Retour à la connexion</a>', "Envoyer le lien", async (form) => {
      await authAction("forgot", { email: form.get("email") });
      const formElement = document.getElementById("auth-form");
      formElement.innerHTML = '<p class="form-success" role="status">Si un compte correspond à cet email, un lien de réinitialisation vient d’être envoyé (valable 1 heure).</p>';
    });

  const renderReset = () => {
    const token = params.get("token");
    if (!token) {
      authPage("Nouveau mot de passe", "Lien de réinitialisation invalide.", '<p class="form-error" role="alert">Lien invalide. Refaites une demande de réinitialisation.</p>',
        '<a href="/admin/login">Retour à la connexion</a>', "Retour", async () => location.assign("/admin/login"));
      return;
    }
    authPage("Nouveau mot de passe", "12 caractères minimum, avec au moins une lettre et un chiffre.",
      `${formField("password", "Nouveau mot de passe", "password", "", 'autocomplete="new-password" required minlength="12" maxlength="128"')}${formField("confirm", "Confirmer", "password", "", 'autocomplete="new-password" required')}`,
      '<a href="/admin/login">Retour à la connexion</a>', "Enregistrer", async (form) => {
        await authAction("reset", { token, password: form.get("password"), confirm: form.get("confirm") });
        showToast("Mot de passe mis à jour. Connectez-vous.");
        location.assign("/admin/login");
      });
  };

  const renderChangePassword = async (session) => {
    const description = session.mustChangePassword
      ? "Pour des raisons de sécurité, choisissez un nouveau mot de passe avant de continuer."
      : "12 caractères minimum, avec au moins une lettre et un chiffre.";
    authPage("Changer le mot de passe", description,
      `${formField("current", "Mot de passe actuel", "password", "", 'autocomplete="current-password" required')}${formField("password", "Nouveau mot de passe", "password", "", 'autocomplete="new-password" required minlength="12" maxlength="128"')}${formField("confirm", "Confirmer", "password", "", 'autocomplete="new-password" required')}`,
      "", "Enregistrer", async (form) => {
        await authAction("change", { current: form.get("current"), password: form.get("password"), confirm: form.get("confirm") });
        location.assign("/admin");
      });
  };

  const renderPanel = async (session) => {
    if (session.mustChangePassword && route !== "/admin/change-password") {
      location.replace("/admin/change-password");
      return;
    }
    root.innerHTML = `<div class="panel-shell"><aside class="sidebar"><a class="sidebar-brand" href="/admin">IEEE ISITCom <span>Admin</span></a><nav aria-label="Navigation d’administration"><a href="/admin">Tableau de bord</a>${session.canEdit ? '<a href="/admin/content/events">Événements</a><a href="/admin/content/news">Actualités</a><a href="/admin/content/projects">Projets</a>' : ""}${session.canManage ? '<a href="/admin/site">Contenu de la page d’accueil</a>' : ""}${session.canManageUsers ? '<a href="/admin/users">Administrateurs</a>' : ""}</nav></aside><div class="panel-main"><header class="panel-header">${languageSwitch()}<span class="user-info">${escapeHtml(session.name)} · ${escapeHtml(session.roleLabel)}</span><button id="sign-out" class="button secondary" type="button">Déconnexion</button></header><main id="panel-content" class="page-content"></main></div></div>`;
    document.getElementById("sign-out").addEventListener("click", async () => {
      const response = await fetch("/api/auth/csrf", { credentials: "same-origin" });
      const { csrfToken } = await response.json();
      const body = new URLSearchParams({ csrfToken, callbackUrl: "/admin/login", json: "true" });
      await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      location.assign("/admin/login");
    });

    if (route === "/admin/change-password") {
      renderChangePassword(session);
      return;
    }
    if (route === "/admin/site") {
      if (!session.canManage) throw new Error("Accès refusé.");
      await renderSiteManager();
      return;
    }
    if (route === "/admin/users") {
      if (!session.canManageUsers) throw new Error("Accès refusé.");
      await renderUsersManager();
      return;
    }
    if (!contentRoute) {
      const data = await api("/api/admin/data?view=dashboard");
      document.getElementById("panel-content").innerHTML = `<div class="page-heading"><div><h1>Bonjour ${escapeHtml(data.name)}</h1><p class="page-kicker">Voici un aperçu du contenu de la branche.</p></div></div><div class="stats-grid">${[["Événements", data.events], ["Actualités", data.news], ["Projets", data.projects]].map(([label, value]) => `<section class="panel-card stat-card"><h2>${label}</h2><p class="stat-value">${value}</p><p class="stat-caption">Enregistrés dans le site</p></section>`).join("")}</div>`;
      return;
    }
   const [, kind, id, newSegment] = contentRoute;
    if (id && id !== "new" && !newSegment) {
      await renderEditor(kind, id, session);
    } else if (id === "new" || newSegment) {
      await renderEditor(kind, null, session);
    } else {
      await renderList(kind, session);
    }
  };

  const sitePhotoDropzone = (fieldId, label) => `
    <div class="field image-field">
      <label for="${fieldId}-file">${label}</label>
      <input id="${fieldId}" name="${fieldId}" type="hidden">
      <input id="${fieldId}-file" class="image-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif">
      <div id="${fieldId}-dropzone" class="image-dropzone"><strong>Déposez une photo ici</strong><span>JPEG, PNG, WebP ou GIF · 8 Mo maximum</span><button id="${fieldId}-choose" class="button secondary" type="button">Choisir une photo</button></div>
      <p id="${fieldId}-status" class="field-hint" aria-live="polite"></p>
      <p id="${fieldId}-error" class="form-error image-error" role="alert" hidden></p>
      <div id="${fieldId}-preview" class="image-preview" hidden><img id="${fieldId}-preview-img" alt="Aperçu de la photo"></div>
    </div>`;

  const uploadSitePhoto = async (file, kind) => {
    const form = new FormData();
    form.set("file", file);
    form.set("kind", kind);
    return api("/api/admin/uploads/image", { method: "POST", body: form });
  };

  const bindSitePhotoUploader = (fieldId, kind, afterUpload) => {
    const input = document.getElementById(`${fieldId}-file`);
    const dropzone = document.getElementById(`${fieldId}-dropzone`);
    const choose = document.getElementById(`${fieldId}-choose`);
    const status = document.getElementById(`${fieldId}-status`);
    const errorBox = document.getElementById(`${fieldId}-error`);
    const upload = async (file) => {
      if (!file) return;
      errorBox.hidden = true;
      status.textContent = "Envoi de la photo…";
      try {
        const result = await uploadSitePhoto(file, kind);
        if (afterUpload) {
          status.textContent = "Photo ajoutée à la galerie.";
          await afterUpload(result);
        } else {
          document.getElementById(fieldId).value = result.publicId;
          const preview = document.getElementById(`${fieldId}-preview`);
          const image = document.getElementById(`${fieldId}-preview-img`);
          image.src = result.secureUrl;
          preview.hidden = false;
          status.textContent = "Photo prête. Enregistrez le formulaire pour publier.";
        }
      } catch (error) {
        errorBox.textContent = error.message || "La photo n’a pas pu être envoyée.";
        errorBox.hidden = false;
        status.textContent = "";
      }
    };
    choose.addEventListener("click", () => input.click());
    input.addEventListener("change", () => upload(input.files[0]));
    dropzone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragging");
    });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-dragging"));
    dropzone.addEventListener("drop", (event) => {
      event.preventDefault();
      dropzone.classList.remove("is-dragging");
      upload(event.dataTransfer.files[0]);
    });
  };

  const renderSiteManager = async () => {
    const data = await api("/api/admin/site");
    const localText = (value) => value && typeof value === "object" ? value.fr || value.en || "" : "";
    const photos = data.photos.length ? data.photos.map((photo) => `
      <article class="managed-card"><img src="${escapeHtml(photo.url)}" alt=""><p>${escapeHtml(photo.originalName || "Photo")}</p><button class="button danger" type="button" data-remove-kind="remove-photo" data-id="${escapeHtml(photo.id)}">Supprimer</button></article>`).join("")
      : '<p class="empty-row">Aucune photo dans la galerie.</p>';
    const formatMilestoneDate = (date) => new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
      dateStyle: "medium", timeZone: "UTC",
    }).format(new Date(`${date}T12:00:00Z`));
    const milestones = data.milestones.length ? data.milestones.map((milestone) => `
      <article class="managed-card"><time datetime="${escapeHtml(milestone.happenedAt)}">${escapeHtml(formatMilestoneDate(milestone.happenedAt))}</time><h3>${escapeHtml(localText(milestone.title))}</h3>${localText(milestone.description) ? `<p>${escapeHtml(localText(milestone.description))}</p>` : ""}<button class="button danger" type="button" data-remove-kind="remove-milestone" data-id="${escapeHtml(milestone.id)}">Supprimer</button></article>`).join("")
      : '<p class="empty-row">Aucun jalon ajouté.</p>';
    const members = data.board?.members?.length ? data.board.members.map((member) => `
      <article class="managed-card">${member.photoUrl ? `<img src="${escapeHtml(member.photoUrl)}" alt="">` : ""}<h3>${escapeHtml(member.fullName)}</h3><p>${escapeHtml(localText(member.position))}</p><button class="button danger" type="button" data-remove-kind="remove-member" data-id="${escapeHtml(member.id)}">Supprimer</button></article>`).join("")
      : '<p class="empty-row">Aucun membre d’équipe publié.</p>';
    const sponsors = data.sponsors.length ? data.sponsors.map((sponsor) => `
      <article class="managed-card">${sponsor.logoUrl ? `<img src="${escapeHtml(sponsor.logoUrl)}" alt="">` : ""}<h3>${escapeHtml(sponsor.name)}</h3><p>${escapeHtml(sponsor.websiteUrl || "")}</p><button class="button danger" type="button" data-remove-kind="remove-sponsor" data-id="${escapeHtml(sponsor.id)}">Supprimer</button></article>`).join("")
      : '<p class="empty-row">Aucun partenaire enregistré.</p>';
    document.getElementById("panel-content").innerHTML = `
      <div class="page-heading"><div><p class="page-kicker">Contenu de la page d’accueil</p><h1>Contenu de la page d’accueil</h1></div></div>
      <section class="panel-card management-section"><h2>Photos de la galerie</h2><p class="field-hint">Ajoutez des photos visibles sur la page d’accueil. Les administrateurs peuvent déposer une image directement ici.</p>${sitePhotoDropzone("galleryPhoto", "Ajouter une photo")}<div class="managed-grid">${photos}</div></section>
      <section class="panel-card management-section"><h2>Équipe actuelle</h2>
        <form id="team-form" class="content-form">
          ${formField("name", "Nom complet *", "text", "", "required maxlength=120")}
          <div class="form-grid">${formField("positionFr", "Fonction (français) *", "text", "", "required maxlength=120")}${formField("positionEn", "Position (English)", "text", "", "maxlength=120")}</div>
          <div class="form-grid"><div class="field"><label for="bioFr">Présentation (français)</label><textarea id="bioFr" name="bioFr" maxlength="1000"></textarea></div><div class="field"><label for="bioEn">Biography (English)</label><textarea id="bioEn" name="bioEn" maxlength="1000"></textarea></div></div>
          ${sitePhotoDropzone("teamPhoto", "Photo de la personne (facultatif)")}
          <button class="button" type="submit">Ajouter à l’équipe</button>
          <p class="form-error" id="team-form-error" role="alert" hidden></p>
        </form><div class="managed-grid">${members}</div>
      </section>
      <section class="panel-card management-section"><h2>Partenaires & sponsors</h2>
        <form id="sponsor-form" class="content-form">
          ${formField("sponsorName", "Nom du partenaire *", "text", "", "required maxlength=120")}
          ${formField("websiteUrl", "Site web", "url", "", "maxlength=500")}
          <div class="form-grid"><div class="field"><label for="descriptionFr">Présentation (français)</label><textarea id="descriptionFr" name="descriptionFr" maxlength="1000"></textarea></div><div class="field"><label for="descriptionEn">Description (English)</label><textarea id="descriptionEn" name="descriptionEn" maxlength="1000"></textarea></div></div>
          ${sitePhotoDropzone("sponsorLogo", "Logo (facultatif)")}
          <button class="button" type="submit">Ajouter un partenaire</button>
          <p class="form-error" id="sponsor-form-error" role="alert" hidden></p>
        </form><div class="managed-grid">${sponsors}</div>
      </section>
      <section class="panel-card management-section"><h2>Jalons de la branche</h2>
        <p class="field-hint">Ajoutez les dates importantes et les réussites de la branche.</p>
        <form id="milestone-form" class="content-form">
          ${formField("happenedAt", "Date *", "date", "", "required")}
          <div class="form-grid">${formField("titleFr", "Titre (français) *", "text", "", "required maxlength=240")}${formField("titleEn", "Titre (anglais)", "text", "", "maxlength=240")}</div>
          <div class="form-grid"><div class="field"><label for="milestoneDescriptionFr">Description (français)</label><textarea id="milestoneDescriptionFr" name="descriptionFr" maxlength="1000"></textarea></div><div class="field"><label for="milestoneDescriptionEn">Description (anglais)</label><textarea id="milestoneDescriptionEn" name="descriptionEn" maxlength="1000"></textarea></div></div>
          <button class="button" type="submit">Ajouter un jalon</button>
          <p class="form-error" id="milestone-form-error" role="alert" hidden></p>
        </form><div class="managed-grid">${milestones}</div>
      </section>`;

    bindSitePhotoUploader("galleryPhoto", "gallery", async () => renderSiteManager());
    bindSitePhotoUploader("teamPhoto", "team");
    bindSitePhotoUploader("sponsorLogo", "sponsors");
    document.getElementById("team-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const values = Object.fromEntries(new FormData(form).entries());
      try {
        await api("/api/admin/site", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          action: "add-member", name: values.name, positionFr: values.positionFr, positionEn: values.positionEn,
          bioFr: values.bioFr, bioEn: values.bioEn, photo: values.teamPhoto,
        }) });
        showToast("Membre ajouté à l’équipe.");
        await renderSiteManager();
      } catch (error) {
        const box = document.getElementById("team-form-error");
        box.textContent = error.message;
        box.hidden = false;
      }
    });
    document.getElementById("sponsor-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const values = Object.fromEntries(new FormData(form).entries());
      try {
        await api("/api/admin/site", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          action: "add-sponsor", name: values.sponsorName, websiteUrl: values.websiteUrl, logo: values.sponsorLogo,
          descriptionFr: values.descriptionFr, descriptionEn: values.descriptionEn,
        }) });
        showToast("Partenaire ajouté.");
        await renderSiteManager();
      } catch (error) {
        const box = document.getElementById("sponsor-form-error");
        box.textContent = error.message;
        box.hidden = false;
      }
    });
    document.getElementById("milestone-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const values = Object.fromEntries(new FormData(form).entries());
      try {
        await api("/api/admin/site", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          action: "add-milestone", happenedAt: values.happenedAt, titleFr: values.titleFr, titleEn: values.titleEn,
          descriptionFr: values.descriptionFr, descriptionEn: values.descriptionEn,
        }) });
        showToast(locale === "fr" ? "Jalon ajouté." : "Milestone added.");
        await renderSiteManager();
      } catch (error) {
        const box = document.getElementById("milestone-form-error");
        box.textContent = error.message;
        box.hidden = false;
      }
    });
    document.querySelectorAll("[data-remove-kind]").forEach((button) => button.addEventListener("click", async () => {
      if (!confirm("Supprimer cet élément du site ?")) return;
      button.disabled = true;
      try {
        await api("/api/admin/site", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          action: button.dataset.removeKind, id: button.dataset.id,
        }) });
        showToast("Élément supprimé.");
        await renderSiteManager();
      } catch (error) {
        showToast(error.message, true);
        button.disabled = false;
      }
    }));
  };

  const renderList = async (kind, session) => {
    const data = await api(`/api/admin/data?view=list&kind=${encodeURIComponent(kind)}`);
    const rows = data.rows.length
      ? data.rows.map((row) => `<tr><td><a class="table-title" href="/admin/content/${kind}/${encodeURIComponent(row.id)}">${escapeHtml(row.title)}</a><p>/${escapeHtml(row.slug)}</p></td><td>${escapeHtml(row.status)}</td><td>${escapeHtml(row.updatedAt)}</td><td><a class="button secondary" href="/admin/content/${kind}/${encodeURIComponent(row.id)}">Modifier</a></td></tr>`).join("")
      : `<tr><td colspan="4" class="empty-row">Aucun contenu pour le moment.</td></tr>`;
    document.getElementById("panel-content").innerHTML = `<div class="page-heading"><div><p class="page-kicker">Gestion du contenu</p><h1>${escapeHtml(data.label)}</h1></div>${session.canEdit ? `<a class="button" href="/admin/content/${kind}/new">Créer un ${escapeHtml(data.singular)}</a>` : ""}</div><section class="panel-card table-wrap"><table><thead><tr><th>Titre</th><th>Statut</th><th>Modifié</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></section>`;
  };

  const renderEditor = async (kind, id, session) => {
    if (!session.canEdit) throw new Error("Accès refusé.");
    const data = id
      ? await api(`/api/admin/data?view=edit&kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}`)
      : { values: { id: "", kind, slug: "", title: {}, summary: {}, description: {}, coverImage: "", status: "DRAFT", publishedAt: "", startsAt: "", endsAt: "", locationName: "", mode: "IN_PERSON", stage: "IN_PROGRESS", techTags: "" }, canDelete: session.canDelete, role: session.role };
    const value = data.values;
    const title = id ? value.title.fr || value.slug : kind === "events" ? "Nouvel événement" : kind === "news" ? "Nouvelle actualité" : "Nouveau projet";
    const localized = (field, label, multiline = false) => `<fieldset class="localized-fieldset"><legend>${label}</legend>${["fr", "en"].map((locale) => {
      const idAttr = `${field}${locale[0].toUpperCase()}${locale.slice(1)}`;
      const labelLocale = locale === "fr" ? "Français" : "English";
      return `<div class="field"><label for="${idAttr}">${labelLocale}${field === "title" && locale === "fr" ? " *" : ""}</label>${multiline
        ? `<textarea id="${idAttr}" name="${idAttr}" rows="${field === "description" ? 8 : 3}" maxlength="${field === "description" ? 50000 : 1000}">${escapeHtml(value[field][locale])}</textarea>`
        : `<input id="${idAttr}" name="${idAttr}" value="${escapeHtml(value[field][locale])}" ${field === "title" && locale === "fr" ? "required maxlength=240" : "maxlength=1000"}>`}</div>`;
    }).join("")}</fieldset>`;
    const statusOptions = [["DRAFT", "Brouillon"], ["IN_REVIEW", "À réviser"], ["PUBLISHED", "Publié / programmé"], ["ARCHIVED", "Archivé"]]
      .filter(([status]) => data.role !== "EDITOR" || status === "DRAFT" || status === "IN_REVIEW")
      .map(([status, label]) => `<option value="${status}" ${value.status === status ? "selected" : ""}>${label}</option>`).join("");
    let extras = "";
    if (kind === "events") extras = `<div class="form-grid">${formField("startsAt", "Début *", "datetime-local", value.startsAt, "required")}<p class="field-hint">Saisissez la date et l’heure locales de Tunis. Le compte à rebours s’affichera automatiquement sur la page Événements.</p>${formField("endsAt", "Fin", "datetime-local", value.endsAt)}<div class="field"><label for="mode">Format</label><select id="mode" name="mode">${[["IN_PERSON","Présentiel"],["ONLINE","En ligne"],["HYBRID","Hybride"]].map(([v,l]) => `<option value="${v}" ${value.mode === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>${formField("locationName", "Lieu", "text", value.locationName, "maxlength=255")}</div>`;
    if (kind === "projects") extras = `<div class="form-grid"><div class="field"><label for="stage">Avancement</label><select id="stage" name="stage">${[["IDEA","Idée"],["IN_PROGRESS","En cours"],["COMPLETED","Terminé"]].map(([v,l]) => `<option value="${v}" ${value.stage === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>${formField("techTags", "Technologies", "text", value.techTags, 'maxlength="1000" placeholder="Arduino, Python, IoT"')}</div>`;
    document.getElementById("panel-content").innerHTML = `<div class="page-heading"><div><p class="page-kicker">${id ? "Modifier le contenu" : "Créer un contenu"}</p><h1>${escapeHtml(title)}</h1></div>${id && data.canDelete ? '<button id="delete-content" class="button danger" type="button">Supprimer</button>' : ""}</div><form id="content-form" class="content-form"><input type="hidden" name="action" value="save"><input type="hidden" name="kind" value="${kind}">${id ? `<input type="hidden" name="id" value="${escapeHtml(id)}">` : ""}<div class="field"><label for="slug">Slug URL *</label><input id="slug" name="slug" value="${escapeHtml(value.slug)}" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxlength="120"><p class="field-hint">Minuscules, chiffres et tirets. Exemple : journee-robotique-2026</p></div>${localized("title","Titre *")}${localized("summary",kind === "news" ? "Extrait" : "Résumé",true)}${localized("description",kind === "news" ? "Contenu" : "Description",true)}${imageUploader(value)}${extras}<div class="form-grid"><div class="field"><label for="status">Statut</label><select id="status" name="status">${statusOptions}</select></div>${data.role !== "EDITOR" ? `${formField("publishedAt","Date de publication (optionnelle)","datetime-local",value.publishedAt)}<p class="field-hint">Une date future programme la publication.</p>` : ""}</div><p id="form-error" class="form-error" role="alert" hidden></p><div class="form-actions"><button class="button" type="submit">Enregistrer</button><a class="button secondary" href="/admin/content/${kind}">Annuler</a></div></form>`;

    const contentForm = document.getElementById("content-form");
    const imageInput = document.getElementById("coverImageFile");
    const dropzone = document.getElementById("image-dropzone");
    const imageStatus = document.getElementById("image-status");
    const imageError = document.getElementById("image-error");
    const preview = document.getElementById("image-preview");
    const previewImage = document.getElementById("image-preview-img");
    let uploadingImage = false;

    const uploadImage = async (file) => {
      imageError.hidden = true;
      if (!file) return;
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 8 * 1024 * 1024) {
        imageError.textContent = "Choisissez une image JPEG, PNG, WebP ou GIF de 8 Mo maximum.";
        imageError.hidden = false;
        imageInput.value = "";
        return;
      }
      uploadingImage = true;
      imageStatus.textContent = "Envoi de la photo…";
      const submitButton = contentForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      const uploadData = new FormData();
      uploadData.set("file", file);
      uploadData.set("kind", kind);
      try {
        const uploaded = await api("/api/admin/uploads/image", { method: "POST", body: uploadData });
        document.getElementById("coverImage").value = uploaded.publicId;
        previewImage.src = uploaded.secureUrl;
        preview.hidden = false;
        imageStatus.textContent = "Photo envoyée. Enregistrez le formulaire pour l’ajouter au contenu.";
      } catch (error) {
        imageError.textContent = error.message || "La photo n’a pas pu être envoyée.";
        imageError.hidden = false;
        imageStatus.textContent = "";
      } finally {
        uploadingImage = false;
        submitButton.disabled = false;
        imageInput.value = "";
      }
    };

    document.getElementById("choose-image").addEventListener("click", () => imageInput.click());
    imageInput.addEventListener("change", () => uploadImage(imageInput.files[0]));
    dropzone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragging");
    });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-dragging"));
    dropzone.addEventListener("drop", (event) => {
      event.preventDefault();
      dropzone.classList.remove("is-dragging");
      uploadImage(event.dataTransfer.files[0]);
    });
    document.getElementById("remove-image").addEventListener("click", () => {
      document.getElementById("coverImage").value = "";
      previewImage.removeAttribute("src");
      preview.hidden = true;
      imageStatus.textContent = "La photo sera retirée du contenu après l’enregistrement.";
      imageError.hidden = true;
    });

    contentForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (uploadingImage) return;
      if (!form.reportValidity()) return;
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      const formError = document.getElementById("form-error");
      formError.hidden = true;
      try {
        const result = await api("/api/admin/content", { method: "POST", body: new FormData(form) });
        if (result.error) throw new Error(result.error);
        location.assign(result.redirectTo);
      } catch (error) {
        formError.textContent = error.message;
        formError.hidden = false;
      } finally {
        button.disabled = false;
      }
    });
    const deleteButton = document.getElementById("delete-content");
    if (deleteButton) deleteButton.addEventListener("click", async () => {
      if (!confirm("Supprimer définitivement cet élément ?")) return;
      const form = new FormData();
      form.set("action", "delete");
      form.set("kind", kind);
      form.set("id", id);
      deleteButton.disabled = true;
      try {
        const result = await api("/api/admin/content", { method: "POST", body: form });
        if (result.error) throw new Error(result.error);
        location.assign(result.redirectTo);
      } catch (error) {
        showToast(error.message, true);
        deleteButton.disabled = false;
      }
    });
  };

  const start = async () => {
    document.documentElement.lang = locale;
    document.title = locale === "en" ? "Administration | IEEE ISITCom" : "Administration | IEEE ISITCom";
    if (route === "/admin/login") return renderLogin();
    if (route === "/admin/forgot-password") return renderForgot();
    if (route === "/admin/reset-password") return renderReset();
    try {
      const session = await api("/api/admin/data?view=session");
      await renderPanel(session);
    } catch (error) {
      if (error.message.includes("Session expirée")) {
        location.replace(`/admin/login?callbackUrl=${encodeURIComponent(route + location.search)}`);
        return;
      }
      root.innerHTML = `<main class="auth-page"><section class="auth-card"><h1>Erreur</h1><p class="form-error">${escapeHtml(error.message)}</p><a class="button" href="/admin/login">Connexion</a></section></main>`;
    }
  };
  start().catch((error) => {
    console.error("Unable to render administration page.", error);
    root.innerHTML = `<main class="auth-page"><section class="auth-card"><h1>Erreur</h1><p class="form-error">${escapeHtml(error.message || "Une erreur est survenue.")}</p><a class="button" href="/admin/login">Connexion</a></section></main>`;
  });
})();
