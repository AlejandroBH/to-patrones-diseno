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
    this.gestorComandos = new GestorComandos();
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
        observador.notificar(evento, datos);
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

  // Aplica una o más estrategias de filtrado a la lista completa de tareas.
  obtenerTareas(estrategias = []) {
    let tareas = Array.from(this.tareas.values());

    if (Array.isArray(estrategias)) {
      // Aplicar cada estrategia de filtro secuencialmente.
      for (const estrategia of estrategias) {
        tareas = estrategia.ejecutar(tareas);
      }
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

  // Métodos de interfaz del comando
  ejecutarCrearTarea(tipo, datos) {
    const comando = new ComandoCrearTarea(this, tipo, datos);
    return this.gestorComandos.ejecutarComando(comando);
  }

  ejecutarActualizarTarea(id, cambios) {
    const comando = new ComandoActualizarTarea(this, id, cambios);
    return this.gestorComandos.ejecutarComando(comando);
  }

  ejecutarEliminarTarea(id) {
    const comando = new ComandoEliminarTarea(this, id);
    return this.gestorComandos.ejecutarComando(comando);
  }

  deshacerUltimaAccion() {
    return this.gestorComandos.deshacer();
  }

  rehacerUltimaAccion() {
    return this.gestorComandos.rehacer();
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

// 5. Filtrado de tareas con Strategy Pattern
class FiltroStrategy {
  ejecutar() {
    throw new Error(
      "El método 'ejecutar' debe ser implementado por la subclase."
    );
  }
}

class FiltroPorCompletada extends FiltroStrategy {
  constructor(estadoCompletada) {
    super();
    this.estadoCompletada = estadoCompletada;
  }

  ejecutar(tareas) {
    return tareas.filter((t) => t.completada === this.estadoCompletada);
  }
}

class FiltroPorPrioridad extends FiltroStrategy {
  constructor(prioridad) {
    super();
    this.prioridad = prioridad;
  }

  ejecutar(tareas) {
    return tareas.filter((t) => t.prioridad === this.prioridad);
  }
}

class FiltroPorTipo extends FiltroStrategy {
  constructor(tipo) {
    super();
    this.tipo = tipo;
  }

  ejecutar(tareas) {
    return tareas.filter((t) => t.tipo === this.tipo);
  }
}

// 6. Interfaz Base del Comando
class Comando {
  constructor(gestorTareas) {
    this.gestorTareas = gestorTareas;
    this.datos = null;
  }

  ejecutar() {
    throw new Error("El método 'ejecutar' debe ser implementado.");
  }

  deshacer() {
    throw new Error("El método 'deshacer' debe ser implementado.");
  }
}

// Comando para Crear Tarea
class ComandoCrearTarea extends Comando {
  constructor(gestorTareas, tipo, datos) {
    super(gestorTareas);
    this.tipo = tipo;
    this.datosCreacion = datos;
    this.tareaCreadaId = null;
  }

  ejecutar() {
    const tarea = this.gestorTareas.crearTarea(this.tipo, this.datosCreacion);
    this.tareaCreadaId = tarea.id;
    return true;
  }

  deshacer() {
    // La acción inversa es eliminar la tarea que se creó
    if (this.tareaCreadaId !== null) {
      return this.gestorTareas.eliminarTarea(this.tareaCreadaId);
    }
    return false;
  }
}

// Comando para Actualizar Tarea
class ComandoActualizarTarea extends Comando {
  constructor(gestorTareas, id, cambios) {
    super(gestorTareas);
    this.id = id;
    this.cambiosNuevos = cambios;
    this.cambiosAntiguos = {};
  }

  ejecutar() {
    const tarea = this.gestorTareas.obtenerTarea(this.id);

    if (!tarea) return false;

    for (const key in this.cambiosNuevos) {
      if (key in tarea) {
        this.cambiosAntiguos[key] = tarea[key];
      }
    }

    Object.assign(tarea, this.cambiosNuevos);
    this.gestorTareas.notificar("tarea_actualizada", tarea);
    return true;
  }

  deshacer() {
    const tarea = this.gestorTareas.obtenerTarea(this.id);
    if (tarea) {
      Object.assign(tarea, this.cambiosAntiguos);
      this.gestorTareas.notificar("tarea_revertida", tarea);
      return true;
    }
    return false;
  }
}

// Comando para Eliminar Tarea
class ComandoEliminarTarea extends Comando {
  constructor(gestorTareas, id) {
    super(gestorTareas);
    this.id = id;
    this.datosTareaEliminada = null;
  }

  ejecutar() {
    const tarea = this.gestorTareas.obtenerTarea(this.id);

    if (tarea) {
      this.datosTareaEliminada = { ...tarea };
      this.gestorTareas.tareas.delete(this.id);
      this.gestorTareas.notificar("tarea_eliminada", tarea);
      return true;
    }
    return false;
  }

  deshacer() {
    if (this.datosTareaEliminada) {
      const tareaRestaurada = this.datosTareaEliminada;
      this.gestorTareas.tareas.set(tareaRestaurada.id, tareaRestaurada);
      this.gestorTareas.notificar("tarea_restaurada", tareaRestaurada);
      return true;
    }
    return false;
  }
}

class GestorComandos {
  constructor() {
    this.historialUndo = [];
    this.historialRedo = [];
  }

  ejecutarComando(comando) {
    try {
      if (comando.ejecutar()) {
        this.historialUndo.push(comando);
        this.historialRedo = [];
        console.log(
          `[Comando Ejecutado] Añadido al historial de Undo. Total: ${this.historialUndo.length}`
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error al ejecutar comando:", error.message);
      return false;
    }
  }

  deshacer() {
    if (this.historialUndo.length > 0) {
      const comando = this.historialUndo.pop();
      if (comando.deshacer()) {
        this.historialRedo.push(comando);
        console.log(
          `[Deshacer] Comando deshecho. Undo: ${this.historialUndo.length}, Redo: ${this.historialRedo.length}`
        );
        return true;
      }
      this.historialUndo.push(comando);
    } else {
      console.log("Nada que deshacer.");
    }
    return false;
  }

  rehacer() {
    if (this.historialRedo.length > 0) {
      const comando = this.historialRedo.pop();
      if (comando.ejecutar()) {
        this.historialUndo.push(comando);
        console.log(
          `[Rehacer] Comando re-ejecutado. Undo: ${this.historialUndo.length}, Redo: ${this.historialRedo.length}`
        );
        return true;
      }
      this.historialRedo.push(comando);
    } else {
      console.log("Nada que rehacer.");
    }
    return false;
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

const tareaBasica2 = gestor.crearTarea("basica", {
  titulo: "Jugar videojuegos",
  descripcion: "Avanzar en resident evil",
  prioridad: "baja",
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
tareaBasica2.completar();

console.log("\n📊 ESTADÍSTICAS FINALES:");
console.log(gestor.obtenerEstadisticas());

console.log("\n📋 TAREAS PENDIENTES:");
const pendientes = gestor.obtenerTareas({ completada: false });
pendientes.forEach((tarea) => {
  console.log(`- ${tarea.titulo} (${tarea.tipo})`);
});

console.log("\n📈 ESTADÍSTICAS DE EVENTOS:");
console.log(observadorEstadisticas.obtenerEstadisticas());

console.log("\n🔄 DEMOSTRACIÓN DEL PATRÓN STRATEGY");

const estrategiaPendientes = new FiltroPorCompletada(false);
const tareasPendientes = gestor.obtenerTareas([estrategiaPendientes]);
console.log("\n1. Tareas Pendientes:");
tareasPendientes.forEach((t) => console.log(`- ${t.titulo} (${t.prioridad})`));

const estrategiaCompletadas = new FiltroPorCompletada(true);
const estrategiaBajaPrioridad = new FiltroPorPrioridad("baja");

const completadasBaja = gestor.obtenerTareas([
  estrategiaCompletadas,
  estrategiaBajaPrioridad,
]);
console.log("\n2. Tareas Completadas de Prioridad Baja:");
completadasBaja.forEach((t) =>
  console.log(
    `- ${t.titulo} (${t.prioridad}, ${t.completada ? "Completa" : "Pendiente"})`
  )
);

console.log("\n🚀 DEMOSTRACIÓN DEL PATRÓN COMANDO");

gestor.ejecutarCrearTarea("basica", {
  titulo: "Preparar Reporte Mensual",
  prioridad: "alta",
});

const idJugar = 5;

gestor.ejecutarActualizarTarea(idJugar, { completada: false });
console.log(
  `Estado Tarea ${idJugar} ('Jugar') después de actualizar: ${
    gestor.obtenerTarea(idJugar).completada ? "Completa" : "Pendiente"
  }`
);

console.log(
  "\n⏪ 2. Deshaciendo la última acción (Actualizar 'Jugar' a Completa)..."
);
gestor.deshacerUltimaAccion();
console.log(
  `Estado Tarea ${idJugar} ('Jugar') después de UNDO: ${
    gestor.obtenerTarea(idJugar).completada ? "Completa" : "Pendiente"
  }`
);

console.log("\n⏪ 3. Deshaciendo la penúltima acción (Eliminar 'Reporte')...");
gestor.deshacerUltimaAccion();

console.log(`Existe Tarea 6 ('Reporte'): ${!!gestor.obtenerTarea(6)}`);

console.log("\n⏩ 4. Rehaciendo la acción (Re-crear 'Reporte')...");
gestor.rehacerUltimaAccion();
console.log(
  `Existe Tarea 6 ('Reporte') después de REDO: ${!!gestor.obtenerTarea(6)}`
);

console.log("\n⏩ 5. Rehaciendo la acción (Actualizar 'Jugar' a Pendiente)...");
gestor.rehacerUltimaAccion();
console.log(
  `Estado Tarea ${idJugar} ('Jugar') después de REDO: ${
    gestor.obtenerTarea(idJugar).completada ? "Completa" : "Pendiente"
  }`
);

console.log("\n🎯 Demostración de Undo/Redo completada.");

console.log("\n🎯 Sistema de gestión de tareas completado exitosamente!");
