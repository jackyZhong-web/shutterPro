window.loginInit = () => {
  const loginName = window.qs("[data-login-name]")
  const password = window.qs("[data-login-password]")
  const passwordToggle = window.qs("[data-login-password-toggle]")
  const btn = window.qs("[data-login-submit]")
  const error = window.qs("[data-login-error]")
  const nameError = window.qs("[data-login-name-error]")
  const passwordError = window.qs("[data-login-password-error]")
  const contactBtn = window.qs("[data-contact-sales]")
  const contactModal = window.qs("[data-contact-modal]")
  const contactName = window.qs("[data-contact-name]")
  const contactEmail = window.qs("[data-contact-email]")
  const contactPhone = window.qs("[data-contact-phone]")
  const contactCloses = window.qsa("[data-contact-close]")
  if (!btn) return
  const shakeInput = (input) => {
    if (!input) return
    input.classList.remove("shake")
    void input.offsetWidth
    input.classList.add("shake")
    setTimeout(() => input.classList.remove("shake"), 400)
  }
  const setFieldError = (input, errorEl, message) => {
    const field = input ? input.closest(".form-field") : null
    if (field) field.classList.toggle("invalid", !!message)
    if (errorEl) errorEl.textContent = message || ""
    if (message) shakeInput(input)
  }
  const clearErrors = () => {
    if (error) error.textContent = ""
    setFieldError(loginName, nameError, "")
    setFieldError(password, passwordError, "")
  }
  if (loginName) loginName.addEventListener("input", () => setFieldError(loginName, nameError, ""))
  if (password) password.addEventListener("input", () => setFieldError(password, passwordError, ""))
  if (password && passwordToggle) {
    passwordToggle.addEventListener("click", (e) => {
      e.preventDefault()
      const visible = password.type === "text"
      password.type = visible ? "password" : "text"
      passwordToggle.textContent = visible ? "👁" : "🙈"
      passwordToggle.setAttribute("aria-label", visible ? "Show password" : "Hide password")
    })
  }
  if (contactBtn && contactModal) {
    contactBtn.addEventListener("click", () => {
      if (contactName) contactName.textContent = contactBtn.dataset.adminName || ""
      if (contactEmail) contactEmail.textContent = contactBtn.dataset.adminEmail || ""
      if (contactPhone) contactPhone.textContent = contactBtn.dataset.adminPhone || ""
      contactModal.classList.add("is-open")
    })
    contactCloses.forEach(btn => {
      btn.addEventListener("click", () => {
        contactModal.classList.remove("is-open")
      })
    })
  }
  btn.addEventListener("click", async () => {
    clearErrors()
    const payload = { loginName: loginName ? loginName.value : "", password: password ? password.value : "" }
    const res = window.apiFetch
      ? await window.apiFetch("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), skipAuthRedirect: true })
      : await fetch("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    if (!res.ok) {
      let body = null
      try{ body = await res.json() }catch(e){}
      const code = body && body.error ? body.error : ""
      if (code === "user_not_found") {
        setFieldError(loginName, nameError, "User not found.")
        return
      }
      if (code === "password_incorrect") {
        setFieldError(password, passwordError, "Incorrect password.")
        return
      }
      if (code === "invalid_request") {
        if (!payload.loginName) setFieldError(loginName, nameError, "Please enter your email or login name.")
        if (!payload.password) setFieldError(password, passwordError, "Please enter your password.")
        return
      }
      if (error) error.textContent = "Login failed. Please try again."
      return
    }
    const data = await res.json()
    window.setToken(data.token)
    location.href = data.role === "Admin" ? "/admin-company.html" : "/user-dashboard.html"
  })
}
