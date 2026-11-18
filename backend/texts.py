"""Textos y datos fijos: tonos, palancas del simulador y textos por idioma."""

TONES = {
    1: ("muy agobiado",
        "Voz serena y protectora; la persona tiene poca energía, dale UNA cosa cada vez. "
        "ATENCIÓN BAJA: asume que solo lee la frase inicial y el frente de cada tarjeta, así que cada frente debe bastar solo. "
        "Límites: frase_inicial máx. 15 palabras, frente máx. 9, reverso máx. 25. Frases de 8-12 palabras. "
        "Abre con algo que ya hacen bien SOLO si el plan lo respalda; si no, abre con una tarea pequeña. "
        "Presenta lo pendiente y añade enseguida cómo empezar: nunca un riesgo suelto. "
        "Evita: urgente, peligro, grave, deberías, tienes que. El primer paso se hace en pocos minutos y sin papeles."),
    2: ("preocupado",
        "Voz cálida y cercana, como alguien de confianza que ordena el desorden. "
        "ATENCIÓN BAJA: el frente debe bastar solo; el reverso solo amplía. "
        "Límites: frase_inicial máx. 20 palabras, frente máx. 10, reverso máx. 35. "
        "Empieza por algo positivo real del plan. Explica la consecuencia en una situación cotidiana "
        "('si uno de los dos faltara, los niños seguirían con su vida de siempre') y presenta los problemas como cosas con solución. "
        "Da sensación de control: 'tú decides el ritmo'. Sin alarmismo ni comparaciones con otras familias. "
        "El primer paso es una comprobación o pregunta fácil, no un gran compromiso."),
    3: ("neutral",
        "Voz clara, equilibrada y con curiosidad: se gana la atención con claridad, no con emoción. "
        "ATENCIÓN MEDIA: el frente promete algo concreto y el reverso lo cumple en dos o tres frases. "
        "Límites: frase_inicial máx. 25 palabras, frente máx. 12, reverso máx. 45. "
        "Mezcla lo que funciona y lo que merece atención, una idea por tarjeta. Engancha con un contraste o una pregunta "
        "('¿Para qué sirve ese dinero parado?'). Usa comparaciones que permitan interpretar un dato sin dar el número. "
        "En el primer paso explica en una frase qué se gana al darlo."),
    4: ("seguro",
        "Voz directa y ordenada, de quien quiere decidir; valora su tiempo. "
        "ATENCIÓN MEDIA. Límites: frase_inicial máx. 25 palabras, frente máx. 12, reverso máx. 45. "
        "Abre con la decisión y la razón que la sostiene. Muestra el intercambio: qué ganas y qué dejas al elegir, "
        "y qué otra meta usa ese mismo dinero si el plan lo indica. Nombra el riesgo principal con claridad. "
        "Sigue sin jerga: traduce los términos técnicos."),
    5: ("muy confiado",
        "Voz de igual a igual. Confianza no es conocimiento: sigue sin jerga. "
        "ATENCIÓN ALTA: leerá reverso y detalle, puedes dar más matiz, pero una idea por frase. "
        "Límites: frase_inicial máx. 25 palabras, frente máx. 12, reverso máx. 45. "
        "Di con claridad lo que más puede torcer el plan y qué supuesto pesa más en la decisión, en palabras corrientes. "
        "No suavices ni dramatices los riesgos. Plantea el intercambio como dos caminos, no como consejo único. "
        "Sin halagos; respeto = datos honestos y decisión suya."),
}

# Palancas del simulador "y si...?". La IA solo ELIGE ids de esta lista.
# Los coeficientes son de mientras se hace la app y se etiquetan asi en el mapa.
# TO DO: Mirar lo de las etiquetas por lo de años/anos
LEVERS = {
    "ahorro_mensual": {"etiqueta": "Ahorro mensual extra", "unidad": "$", "min": 0, "max": 1000,
                       "paso": 50, "puntos_por_unidad": 0.010},
    "pago_deuda_extra": {"etiqueta": "Pago extra de deuda al mes", "unidad": "$", "min": 0, "max": 1000,
                         "paso": 50, "puntos_por_unidad": 0.008},
    "gasto_menos": {"etiqueta": "Gasto mensual que recortas", "unidad": "$", "min": 0, "max": 500,
                    "paso": 25, "puntos_por_unidad": 0.012},
    "anos_extra_trabajando": {"etiqueta": "Anos extra trabajando", "unidad": "anos", "min": 0, "max": 5,
                              "paso": 1, "puntos_por_unidad": 2.0},
}
DEFAULT_LEVERS = ["ahorro_mensual", "anos_extra_trabajando"]

# Rango del slider segun la familia. Fraccion del ingreso mensual que como maximo ofrece cada palanca.
CAPS = {"ahorro_mensual": 1.0, "pago_deuda_extra": 1.0, "gasto_menos": 0.5}
# Ajustes manuales por caso (mandan sobre CAPS), p. ej. {"samantha-lewis": {"ahorro_mensual": 1500}}
CASE_MAX: dict[str, dict[str, int]] = {}

TEXTS = {
    "es": {
        "mood": {1: "muy agobiado", 2: "preocupado", 3: "neutral", 4: "seguro", 5: "muy confiado"},
        "levers": {
            "ahorro_mensual": ("Ahorro mensual extra", "$"),
            "pago_deuda_extra": ("Pago extra de deuda al mes", "$"),
            "gasto_menos": ("Gasto mensual que recortas", "$"),
            "anos_extra_trabajando": ("Años extra trabajando", "años"),
        },
        "notice": "Simulador ilustrativo: muestra la dirección del cambio, no una proyección de Sherpas.",
        "short_notice": "Simulador ilustrativo.",
        "default_step": "Habla con tu asesor para elegir el primer paso",
        "fallback_step": "Revisa tu plan con un asesor",
        "mail_subject": "Quiero hablar de mi plan",
        "mail_body": "Hola, he visto mi plan y quiero ayuda con este paso: {title}",
        "fallback_intro": "Tu plan ya está listo: vamos a verlo juntos.",
        "fallback_front": "Tu plan está listo",
        "fallback_back": "Habla con tu asesor para verlo juntos.",
        "chat_error": "Ahora mismo no puedo responder. Tu asesor puede ayudarte con esto.",
        "family": "la familia",
        "goal_names": {"VACATION": "Ir de vacaciones", "VEHICLE_PURCHASE": "Comprar un vehículo",
                       "REAL_ESTATE_PURCHASE": "Comprar una casa", "COLLEGE": "Universidad de {who}",
                       "RETIREMENT": "Jubilación de {who}"},
        "ics": {"cal_name": "Mis metas con Sherpas", "open": "Abre tu plan y revisa el siguiente paso.",
                "when": {365: "falta 1 año", 180: "faltan 6 meses", 30: "falta 1 mes", 7: "falta 1 semana", 0: "es hoy"},
                "nudges": ["Un pequeño paso hoy te acerca a esta meta.",
                           "Echa un vistazo a tu plan: ¿sigue siendo la meta de siempre?",
                           "Cinco minutos con tu plan hoy te lo ponen más fácil mañana."]},
    },
    "en": {
        "mood": {1: "very overwhelmed", 2: "worried", 3: "neutral", 4: "confident", 5: "very confident"},
        "levers": {
            "ahorro_mensual": ("Extra monthly savings", "$"),
            "pago_deuda_extra": ("Extra monthly debt payment", "$"),
            "gasto_menos": ("Monthly spending you cut", "$"),
            "anos_extra_trabajando": ("Extra years working", "years"),
        },
        "notice": "Illustrative simulator: it shows the direction of change, not a Sherpas projection.",
        "short_notice": "Illustrative simulator.",
        "default_step": "Talk to your advisor to choose the first step",
        "fallback_step": "Review your plan with an advisor",
        "mail_subject": "I'd like to talk about my plan",
        "mail_body": "Hi, I've seen my plan and I'd like help with this step: {title}",
        "fallback_intro": "Your plan is ready: let's go through it together.",
        "fallback_front": "Your plan is ready",
        "fallback_back": "Talk to your advisor to go through it together.",
        "chat_error": "I can't answer right now. Your advisor can help you with this.",
        "family": "the family",
        "goal_names": {"VACATION": "Go on vacation", "VEHICLE_PURCHASE": "Buy a vehicle",
                       "REAL_ESTATE_PURCHASE": "Buy a home", "COLLEGE": "{who}'s college",
                       "RETIREMENT": "{who}'s retirement"},
        "ics": {"cal_name": "My goals with Sherpas", "open": "Open your plan and check the next step.",
                "when": {365: "1 year to go", 180: "6 months to go", 30: "1 month to go", 7: "1 week to go", 0: "it's today"},
                "nudges": ["A small step today brings this goal closer.",
                           "Take a look at your plan: is this still the goal you want?",
                           "Five minutes with your plan today make tomorrow easier."]},
    },
}

def build_levers(ids, language, free_month=None, case_id=None):
    """Palancas del simulador. Si se conoce el dinero libre al mes (o hay ajuste manual), el maximo se adapta a la familia."""
    labels = TEXTS[language]["levers"]
    out = []
    for i in ids:
        lv = dict(LEVERS[i])
        base_max, step = lv["max"], lv["paso"]
        manual = CASE_MAX.get(case_id or "", {}).get(i)
        if manual:
            lv["max"] = int(manual)
        elif free_month and free_month > 0 and i in CAPS:
            lv["max"] = max(step * 2, int(free_month * CAPS[i] // step * step))
        if lv["max"] != base_max:  # el recorrido completo del slider sigue valiendo los mismos puntos
            lv["puntos_por_unidad"] = round(lv["puntos_por_unidad"] * base_max / lv["max"], 5)
        out.append({"id": i, **lv, "etiqueta": labels[i][0], "unidad": labels[i][1]})
    return out