import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background font-sans">

      {/* NAV */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4v16M18 4v16M6 12h12"/></svg>
          </div>
          <span className="text-lg font-semibold tracking-tight">GymHub</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/login")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Iniciar sesión</button>
          <button onClick={() => navigate("/register")} className="text-sm bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors">Crear cuenta</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="text-center px-8 py-20 max-w-3xl mx-auto">
        <div className="inline-block bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-1 rounded-full mb-6 border border-emerald-200">
          Gestión de gimnasios · 100% en la nube
        </div>
        <h1 className="text-5xl font-semibold tracking-tight text-foreground mb-5 leading-tight">
          Gestioná tu gimnasio<br /><span className="text-emerald-600">sin complicaciones</span>
        </h1>
        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
          Socios, turnos, pagos y acceso RFID en una sola plataforma.<br />Diseñada para gimnasios que quieren crecer.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button onClick={() => navigate("/register")} className="bg-emerald-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            Empezar gratis
          </button>
          <button onClick={() => navigate("/login")} className="border border-border px-6 py-3 rounded-lg text-sm text-foreground hover:bg-muted transition-colors">
            Ver demo
          </button>
        </div>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-3 border-t border-b border-border">
        {[
          { num: "100%", label: "en la nube" },
          { num: "RFID", label: "control de acceso" },
          { num: "MP", label: "cobros integrados" },
        ].map((s) => (
          <div key={s.num} className="py-8 text-center border-r border-border last:border-r-0">
            <div className="text-2xl font-semibold text-emerald-600">{s.num}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </section>

      {/* FEATURES */}
      <section className="px-8 py-16 max-w-4xl mx-auto">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-8">Funcionalidades</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: "👥", title: "Gestión de socios", desc: "Alta, baja, historial de pagos y estado de membresía en tiempo real." },
            { icon: "📅", title: "Turnos y clases", desc: "Agenda semanal, cupos por clase y reservas online." },
            { icon: "💳", title: "Cobros automáticos", desc: "Integración nativa con MercadoPago. Débito automático y notificaciones." },
            { icon: "📊", title: "Reportes", desc: "Ingresos, asistencia y socios activos con métricas claras." },
          ].map((f) => (
            <div key={f.title} className="bg-card border border-border rounded-xl p-5">
              <div className="text-2xl mb-3">{f.icon}</div>
              <div className="text-sm font-medium text-foreground mb-2">{f.title}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* RFID */}
      <section className="mx-8 mb-16 bg-muted rounded-2xl border border-border p-8 flex flex-col md:flex-row items-center gap-8 max-w-4xl md:mx-auto">
        <div className="flex-1">
          <span className="inline-block bg-emerald-600 text-white text-xs px-3 py-1 rounded-full mb-4">Hardware propio</span>
          <h2 className="text-xl font-semibold text-foreground mb-3">Acceso con tarjeta RFID</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Kiosco de entrada con lector NFC/RFID desarrollado por nuestro equipo. El socio toca y entra. Sin papel, sin fichas, sin fricciones.
          </p>
        </div>
        <div className="bg-background border border-border rounded-xl px-8 py-6 text-center flex-shrink-0">
          <div className="text-4xl mb-2">📡</div>
          <div className="text-xs text-muted-foreground">Kiosco ESP32-S3<br />PN532 NFC</div>
        </div>
      </section>

      {/* PLANES */}
      <section className="px-8 py-16 border-t border-border max-w-4xl mx-auto">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-8">Planes</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: "Básico", price: "Gratis", sub: "siempre", desc: "Hasta 30 socios. Ideal para empezar.", featured: false },
            { name: "Pro", price: "$XX.XXX", sub: "/ mes", desc: "Socios ilimitados, RFID, reportes avanzados y soporte prioritario.", featured: true },
            { name: "Enterprise", price: "A consultar", sub: "", desc: "Multi-sede, API abierta y soporte dedicado.", featured: false },
          ].map((p) => (
            <div key={p.name} className={`rounded-xl p-6 border ${p.featured ? "border-emerald-600 border-2" : "border-border bg-card"}`}>
              {p.featured && <span className="inline-block bg-emerald-50 text-emerald-700 text-xs px-3 py-1 rounded-full mb-3 border border-emerald-200">Más elegido</span>}
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{p.name}</div>
              <div className="text-2xl font-semibold text-foreground">{p.price} <span className="text-sm font-normal text-muted-foreground">{p.sub}</span></div>
              <div className="text-sm text-muted-foreground mt-3 leading-relaxed">{p.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="text-center px-8 py-16 border-t border-border">
        <h2 className="text-2xl font-semibold text-foreground mb-3">Listo para empezar</h2>
        <p className="text-muted-foreground mb-6">Sin tarjeta de crédito. Configuración en 5 minutos.</p>
        <button onClick={() => navigate("/register")} className="bg-emerald-600 text-white px-8 py-3 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
          Crear cuenta gratis
        </button>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border px-8 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} GymHub · Desarrollado por <a href="https://patagoniasoftware.com.ar" className="text-emerald-600 hover:underline">Patagonia Software</a>
      </footer>

    </div>
  );
};

export default Index;
