// Sistema completo de gestión de tareas usando múltiples patrones de diseño

// 1. Singleton para el gestor principal
class GestorTareas {
  constructor() {
    if (GestorTareas.instancia) {
      return GestorTareas.instancia;
    }

    this.tareas = new Map();
    this.siguienteId = 1;
    this.observadores = new Set();
    GestorTareas.instancia = this;
  }

  // Observer Pattern: notificar cambios
  suscribir(observador) {
    this.observadores.add(observador);
  }

  desuscribir(observador) {
    this.observadores.delete(observador);
  }

  notificar(evento, datos) {
    this.observadores.forEach((observador) => {
      try {
        observador(evento, datos);
      } catch (error) {
        console.error("Error en observador:", error);
      }
    });
  }

  // Factory Pattern: crear tareas de diferentes tipos
  crearTarea(tipo, datos) {
    const fabrica = new FabricaTareas();
    const tarea = fabrica.crearTarea(tipo, {
      id: this.siguienteId++,
      ...datos,
      fechaCreacion: new Date(),
    });

    this.tareas.set(tarea.id, tarea);
    this.notificar("tarea_creada", tarea);
    return tarea;
  }

  obtenerTarea(id) {
    return this.tareas.get(id);
  }

  actualizarTarea(id, cambios) {
    const tarea = this.tareas.get(id);
    if (tarea) {
      Object.assign(tarea, cambios);
      this.notificar("tarea_actualizada", tarea);
      return true;
    }
    return false;
  }

  eliminarTarea(id) {
    const tarea = this.tareas.get(id);
    if (tarea) {
      this.tareas.delete(id);
      this.notificar("tarea_eliminada", tarea);
      return true;
    }
    return false;
  }

  obtenerTareas(filtro = {}) {
    let tareas = Array.from(this.tareas.values());

    if (filtro.completada !== undefined) {
      tareas = tareas.filter((t) => t.completada === filtro.completada);
    }

    if (filtro.prioridad) {
      tareas = tareas.filter((t) => t.prioridad === filtro.prioridad);
    }

    if (filtro.tipo) {
      tareas = tareas.filter((t) => t.tipo === filtro.tipo);
    }

    return tareas;
  }

  obtenerEstadisticas() {
    const tareas = Array.from(this.tareas.values());
    return {
      total: tareas.length,
      completadas: tareas.filter((t) => t.completada).length,
      pendientes: tareas.filter((t) => !t.completada).length,
      porTipo: tareas.reduce((acc, t) => {
        acc[t.tipo] = (acc[t.tipo] || 0) + 1;
        return acc;
      }, {}),
      porPrioridad: tareas.reduce((acc, t) => {
        acc[t.prioridad] = (acc[t.prioridad] || 0) + 1;
        return acc;
      }, {}),
    };
  }
}

// 2. Factory Pattern para crear diferentes tipos de tareas
class FabricaTareas {
  crearTarea(tipo, datosBase) {
    switch (tipo.toLowerCase()) {
      case "basica":
        return new TareaBasica(datosBase);
      case "con-fecha-limite":
        return new TareaConFechaLimite(datosBase);
      case "recurrente":
        return new TareaRecurrente(datosBase);
      case "con-subtareas":
        return new TareaConSubtareas(datosBase);
      default:
        throw new Error(`Tipo de tarea '${tipo}' no soportado`);
    }
  }
}

// 3. Clases para diferentes tipos de tareas (usando herencia)
class TareaBasica {
  constructor({ id, titulo, descripcion = "", prioridad = "media" }) {
    this.id = id;
    this.titulo = titulo;
    this.descripcion = descripcion;
    this.prioridad = prioridad;
    this.completada = false;
    this.fechaCreacion = new Date();
    this.tipo = "basica";
  }

  completar() {
    this.completada = true;
    return true;
  }

  obtenerInformacion() {
    return {
      id: this.id,
      titulo: this.titulo,
      descripcion: this.descripcion,
      prioridad: this.prioridad,
      completada: this.completada,
      tipo: this.tipo,
      fechaCreacion: this.fechaCreacion,
    };
  }
}

class TareaConFechaLimite extends TareaBasica {
  constructor(datos) {
    super(datos);
    this.fechaLimite = datos.fechaLimite;
    this.tipo = "con-fecha-limite";
  }

  estaVencida() {
    return new Date() > this.fechaLimite && !this.completada;
  }

  diasRestantes() {
    const diferencia = this.fechaLimite - new Date();
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
  }

  obtenerInformacion() {
    return {
      ...super.obtenerInformacion(),
      fechaLimite: this.fechaLimite,
      estaVencida: this.estaVencida(),
      diasRestantes: this.diasRestantes(),
    };
  }
}

class TareaRecurrente extends TareaBasica {
  constructor(datos) {
    super(datos);
    this.intervalo = datos.intervalo || "diario"; // diario, semanal, mensual
    this.ocurrencias = datos.ocurrencias || 1;
    this.ocurrenciaActual = 1;
    this.tipo = "recurrente";
  }

  completar() {
    this.ocurrenciaActual++;
    if (this.ocurrenciaActual > this.ocurrencias) {
      this.completada = true;
    }
    return this.ocurrenciaActual <= this.ocurrencias;
  }

  obtenerInformacion() {
    return {
      ...super.obtenerInformacion(),
      intervalo: this.intervalo,
      ocurrencias: this.ocurrencias,
      ocurrenciaActual: this.ocurrenciaActual,
      progreso: `${this.ocurrenciaActual}/${this.ocurrencias}`,
    };
  }
}

class TareaConSubtareas extends TareaBasica {
  constructor(datos) {
    super(datos);
    this.subtareas = datos.subtareas || [];
    this.tipo = "con-subtareas";
  }

  agregarSubtarea(titulo, descripcion = "") {
    this.subtareas.push({
      id: Date.now(),
      titulo,
      descripcion,
      completada: false,
    });
  }

  completarSubtarea(idSubtarea) {
    const subtarea = this.subtareas.find((st) => st.id === idSubtarea);
    if (subtarea) {
      subtarea.completada = true;

      // Si todas las subtareas están completas, completar la tarea principal
      const todasCompletas = this.subtareas.every((st) => st.completada);
      if (todasCompletas) {
        this.completada = true;
      }

      return true;
    }
    return false;
  }

  obtenerInformacion() {
    const subtareasCompletas = this.subtareas.filter(
      (st) => st.completada
    ).length;
    return {
      ...super.obtenerInformacion(),
      subtareas: this.subtareas,
      progresoSubtareas: `${subtareasCompletas}/${this.subtareas.length}`,
    };
  }
}

// 4. Observadores (Observer Pattern)
class ObservadorConsola {
  notificar(evento, datos) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${evento}:`, datos.titulo || datos.id);
  }
}

class ObservadorEstadisticas {
  constructor() {
    this.eventos = [];
  }

  notificar(evento, datos) {
    this.eventos.push({ evento, datos, timestamp: new Date() });
  }

  obtenerEstadisticas() {
    return {
      totalEventos: this.eventos.length,
      eventosPorTipo: this.eventos.reduce((acc, e) => {
        acc[e.evento] = (acc[e.evento] || 0) + 1;
        return acc;
      }, {}),
    };
  }
}

// Demostración completa del sistema
console.log("🚀 DEMOSTRACIÓN: SISTEMA COMPLETO DE GESTIÓN DE TAREAS\n");

// Crear instancia singleton
const gestor = new GestorTareas();

// Configurar observadores
const observadorConsola = new ObservadorConsola();
const observadorEstadisticas = new ObservadorEstadisticas();

gestor.suscribir(observadorConsola);
gestor.suscribir(observadorEstadisticas);

// Crear diferentes tipos de tareas
console.log("📝 Creando tareas de diferentes tipos...");

const tareaBasica = gestor.crearTarea("basica", {
  titulo: "Aprender JavaScript",
  descripcion: "Completar el curso de fundamentos",
  prioridad: "alta",
});

const tareaConFecha = gestor.crearTarea("con-fecha-limite", {
  titulo: "Entregar proyecto",
  descripcion: "Proyecto final del módulo",
  prioridad: "alta",
  fechaLimite: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
});

const tareaRecurrente = gestor.crearTarea("recurrente", {
  titulo: "Hacer ejercicio",
  descripcion: "30 minutos de ejercicio diario",
  prioridad: "media",
  intervalo: "diario",
  ocurrencias: 7,
});

const tareaConSubtareas = gestor.crearTarea("con-subtareas", {
  titulo: "Preparar presentación",
  descripcion: "Presentación para el cliente",
  prioridad: "alta",
});

// Agregar subtareas
tareaConSubtareas.agregarSubtarea(
  "Investigar cliente",
  "Revisar información del cliente"
);
tareaConSubtareas.agregarSubtarea("Crear slides", "Diseñar presentación");
tareaConSubtareas.agregarSubtarea(
  "Practicar presentación",
  "Ensayar ante el equipo"
);

console.log("\n📊 ESTADÍSTICAS INICIALES:");
console.log(gestor.obtenerEstadisticas());

console.log("\n✅ COMPLETANDO TAREAS...");

// Completar algunas tareas
gestor.actualizarTarea(tareaBasica.id, { completada: true });

for (let i = 0; i < 3; i++) {
  tareaRecurrente.completar();
}

tareaConSubtareas.completarSubtarea(tareaConSubtareas.subtareas[0].id);
tareaConSubtareas.completarSubtarea(tareaConSubtareas.subtareas[1].id);

console.log("\n📊 ESTADÍSTICAS FINALES:");
console.log(gestor.obtenerEstadisticas());

console.log("\n📋 TAREAS PENDIENTES:");
const pendientes = gestor.obtenerTareas({ completada: false });
pendientes.forEach((tarea) => {
  console.log(`- ${tarea.titulo} (${tarea.tipo})`);
});

console.log("\n📈 ESTADÍSTICAS DE EVENTOS:");
console.log(observadorEstadisticas.obtenerEstadisticas());

console.log("\n🎯 Sistema de gestión de tareas completado exitosamente!");
