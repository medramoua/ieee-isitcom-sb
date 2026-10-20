(() => {
  const root = document.getElementById("admin-root");
  const path = location.pathname.replace(/\/+$/, "") || "/admin";
  const params = new URLSearchParams(location.search);
  const route = path === "/admin.html" ? "/admin" : path;
  const contentRoute = route.match(/^\/admin\/content\/(events|news|projects)(?:\/([^/]+))?(?:\/(new))?$/);
  const callbackUrl = params.get("callbackUrl");
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
  const authPage = (title, description, fields, footer, submitLabel, onSubmit) => {
    root.innerHTML = `<main class="auth-page"><div class="auth-wrap"><div class="auth-brand"><span class="auth-logo">IEEE</span><span>IEEE ISITCom</span></div><section class="auth-card"><h1>${title}</h1><p class="auth-description">${description}</p><form id="auth-form" novalidate>${fields}<p id="form-error" class="form-error" role="alert" hidden></p><p id="form-success" class="form-success" role="status" hidden></p><button class="button full" type="submit">${submitLabel}</button></form></section><div class="auth-footer">${footer}</div></div></main>`;
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
    root.innerHTML = `<div class="panel-shell"><aside class="sidebar"><a class="sidebar-brand" href="/admin">IEEE ISITCom <span>Admin</span></a><nav aria-label="Navigation d’administration"><a href="/admin">Tableau de bord</a>${session.canEdit ? '<a href="/admin/content/events">Événements</a><a href="/admin/content/news">Actualités</a><a href="/admin/content/projects">Projets</a>' : ""}</nav></aside><div class="panel-main"><header class="panel-header"><span class="user-info">${escapeHtml(session.name)} · ${escapeHtml(session.roleLabel)}</span><button id="sign-out" class="button secondary" type="button">Déconnexion</button></header><main id="panel-content" class="page-content"></main></div></div>`;
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
    if (kind === "events") extras = `<div class="form-grid">${formField("startsAt", "Début *", "datetime-local", value.startsAt, "required")}${formField("endsAt", "Fin", "datetime-local", value.endsAt)}<div class="field"><label for="mode">Format</label><select id="mode" name="mode">${[["IN_PERSON","Présentiel"],["ONLINE","En ligne"],["HYBRID","Hybride"]].map(([v,l]) => `<option value="${v}" ${value.mode === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>${formField("locationName", "Lieu", "text", value.locationName, "maxlength=255")}</div>`;
    if (kind === "projects") extras = `<div class="form-grid"><div class="field"><label for="stage">Avancement</label><select id="stage" name="stage">${[["IDEA","Idée"],["IN_PROGRESS","En cours"],["COMPLETED","Terminé"]].map(([v,l]) => `<option value="${v}" ${value.stage === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>${formField("techTags", "Technologies", "text", value.techTags, 'maxlength="1000" placeholder="Arduino, Python, IoT"')}</div>`;
    document.getElementById("panel-content").innerHTML = `<div class="page-heading"><div><p class="page-kicker">${id ? "Modifier le contenu" : "Créer un contenu"}</p><h1>${escapeHtml(title)}</h1></div>${id && data.canDelete ? '<button id="delete-content" class="button danger" type="button">Supprimer</button>' : ""}</div><form id="content-form" class="content-form"><input type="hidden" name="action" value="save"><input type="hidden" name="kind" value="${kind}">${id ? `<input type="hidden" name="id" value="${escapeHtml(id)}">` : ""}<div class="field"><label for="slug">Slug URL *</label><input id="slug" name="slug" value="${escapeHtml(value.slug)}" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxlength="120"><p class="field-hint">Minuscules, chiffres et tirets. Exemple : journee-robotique-2026</p></div>${localized("title","Titre *")}${localized("summary",kind === "news" ? "Extrait" : "Résumé",true)}${localized("description",kind === "news" ? "Contenu" : "Description",true)}${formField("coverImage","Identifiant Cloudinary de l’image (facultatif)","text",value.coverImage,"maxlength=255")}${extras}<div class="form-grid"><div class="field"><label for="status">Statut</label><select id="status" name="status">${statusOptions}</select></div>${data.role !== "EDITOR" ? `${formField("publishedAt","Date de publication (optionnelle)","datetime-local",value.publishedAt)}<p class="field-hint">Une date future programme la publication.</p>` : ""}</div><p id="form-error" class="form-error" role="alert" hidden></p><div class="form-actions"><button class="button" type="submit">Enregistrer</button><a class="button secondary" href="/admin/content/${kind}">Annuler</a></div></form>`;

    document.getElementById("content-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
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
    document.documentElement.lang = "fr";
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
