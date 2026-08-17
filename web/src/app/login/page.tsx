import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="login-wrap">
      <div className="login-card">
        <span className="wordmark">Jakiens</span>
        <p className="sub">Sala de producción</p>

        {error ? <div className="form-error">Email o contraseña incorrectos.</div> : null}

        <form action={loginAction}>
          <div className="fgrid" style={{ gridTemplateColumns: "1fr" }}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required autoFocus />
            </div>
            <div className="field">
              <label htmlFor="password">Contraseña</label>
              <input id="password" name="password" type="password" required />
            </div>
          </div>
          <div className="form-foot">
            <span className="hint">Acceso de producción</span>
            <button className="btn solid" type="submit">
              Entrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
