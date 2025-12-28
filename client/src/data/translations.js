/**
 * Translation system for the Preferences page
 * Supports multiple languages with easy expansion for future translations
 */

export const LANGUAGES = {
    'en-US': 'English (USA)',
    'en-GB': 'English (UK)',
    'es-ES': 'Español',
    'fr-FR': 'Français',
    'de-DE': 'Deutsch',
    'it-IT': 'Italiano',
    'pt-BR': 'Português (Brasil)',
    'ja-JP': '日本語',
    'zh-CN': '中文'
};

export const translations = {
    'en-US': {
        preferences: 'Preferences',
        language: 'Language',
        languageDescription: 'Choose your preferred interface language',
        responseType: 'Response Type',
        responseTypeDescription: 'Full responses include detailed analysis; Brief responses are concise',
        fullResponses: 'Full Responses',
        briefResponses: 'Brief Responses',
        voice: 'Voice Responses',
        voiceDescription: 'Enable audio responses from the oracle',
        voiceOn: 'On',
        voiceOff: 'Off',
        save: 'Save',
        cancel: 'Cancel',
        saving: 'Saving...',
        saved: 'Preferences saved successfully!',
        error: 'Error saving preferences',
        loading: 'Loading preferences...'
    },
    'es-ES': {
        preferences: 'Preferencias',
        language: 'Idioma',
        languageDescription: 'Elige tu idioma de interfaz preferido',
        responseType: 'Tipo de Respuesta',
        responseTypeDescription: 'Las respuestas completas incluyen análisis detallado; las respuestas breves son concisas',
        fullResponses: 'Respuestas Completas',
        briefResponses: 'Respuestas Breves',
        voice: 'Respuestas de Voz',
        voiceDescription: 'Habilita respuestas de audio del oráculo',
        voiceOn: 'Activado',
        voiceOff: 'Desactivado',
        save: 'Guardar',
        cancel: 'Cancelar',
        saving: 'Guardando...',
        saved: '¡Preferencias guardadas exitosamente!',
        error: 'Error al guardar preferencias',
        loading: 'Cargando preferencias...'
    },
    'fr-FR': {
        preferences: 'Préférences',
        language: 'Langue',
        languageDescription: 'Choisissez votre langue d\'interface préférée',
        responseType: 'Type de Réponse',
        responseTypeDescription: 'Les réponses complètes incluent une analyse détaillée; les réponses brèves sont concises',
        fullResponses: 'Réponses Complètes',
        briefResponses: 'Réponses Brèves',
        voice: 'Réponses Vocales',
        voiceDescription: 'Activez les réponses audio de l\'oracle',
        voiceOn: 'Activé',
        voiceOff: 'Désactivé',
        save: 'Enregistrer',
        cancel: 'Annuler',
        saving: 'Enregistrement...',
        saved: 'Préférences enregistrées avec succès!',
        error: 'Erreur lors de l\'enregistrement des préférences',
        loading: 'Chargement des préférences...'
    },
    'de-DE': {
        preferences: 'Einstellungen',
        language: 'Sprache',
        languageDescription: 'Wählen Sie Ihre bevorzugte Oberflächensprache',
        responseType: 'Antworttyp',
        responseTypeDescription: 'Vollständige Antworten enthalten detaillierte Analysen; kurze Antworten sind prägnant',
        fullResponses: 'Vollständige Antworten',
        briefResponses: 'Kurze Antworten',
        voice: 'Sprachantworten',
        voiceDescription: 'Aktivieren Sie Audioantworten des Orakels',
        voiceOn: 'An',
        voiceOff: 'Aus',
        save: 'Speichern',
        cancel: 'Abbrechen',
        saving: 'Speichern...',
        saved: 'Einstellungen erfolgreich gespeichert!',
        error: 'Fehler beim Speichern der Einstellungen',
        loading: 'Einstellungen werden geladen...'
    },
    'it-IT': {
        preferences: 'Preferenze',
        language: 'Lingua',
        languageDescription: 'Scegli la tua lingua di interfaccia preferita',
        responseType: 'Tipo di Risposta',
        responseTypeDescription: 'Le risposte complete includono analisi dettagliate; le risposte brevi sono concise',
        fullResponses: 'Risposte Complete',
        briefResponses: 'Risposte Brevi',
        voice: 'Risposte Vocali',
        voiceDescription: 'Abilita risposte audio dall\'oracolo',
        voiceOn: 'Attivo',
        voiceOff: 'Disattivo',
        save: 'Salva',
        cancel: 'Annulla',
        saving: 'Salvataggio...',
        saved: 'Preferenze salvate con successo!',
        error: 'Errore durante il salvataggio delle preferenze',
        loading: 'Caricamento delle preferenze...'
    },
    'pt-BR': {
        preferences: 'Preferências',
        language: 'Idioma',
        languageDescription: 'Escolha seu idioma de interface preferido',
        responseType: 'Tipo de Resposta',
        responseTypeDescription: 'Respostas completas incluem análise detalhada; respostas breves são concisas',
        fullResponses: 'Respostas Completas',
        briefResponses: 'Respostas Breves',
        voice: 'Respostas de Voz',
        voiceDescription: 'Ative respostas de áudio do oráculo',
        voiceOn: 'Ativado',
        voiceOff: 'Desativado',
        save: 'Salvar',
        cancel: 'Cancelar',
        saving: 'Salvando...',
        saved: 'Preferências salvas com sucesso!',
        error: 'Erro ao salvar preferências',
        loading: 'Carregando preferências...'
    },
    'ja-JP': {
        preferences: '設定',
        language: '言語',
        languageDescription: '希望するインターフェース言語を選択してください',
        responseType: '応答タイプ',
        responseTypeDescription: '完全な応答には詳細な分析が含まれます。簡潔な応答は要点です',
        fullResponses: '完全な応答',
        briefResponses: '簡潔な応答',
        voice: '音声応答',
        voiceDescription: 'オラクルの音声応答を有効にします',
        voiceOn: 'オン',
        voiceOff: 'オフ',
        save: '保存',
        cancel: 'キャンセル',
        saving: '保存中...',
        saved: '設定が正常に保存されました!',
        error: '設定の保存中にエラーが発生しました',
        loading: '設定を読み込み中...'
    },
    'zh-CN': {
        preferences: '偏好设置',
        language: '语言',
        languageDescription: '选择您首选的界面语言',
        responseType: '响应类型',
        responseTypeDescription: '完整响应包含详细分析；简要响应简洁明了',
        fullResponses: '完整响应',
        briefResponses: '简要响应',
        voice: '语音响应',
        voiceDescription: '启用来自甲骨文的音频响应',
        voiceOn: '开启',
        voiceOff: '关闭',
        save: '保存',
        cancel: '取消',
        saving: '保存中...',
        saved: '偏好设置保存成功!',
        error: '保存偏好设置时出错',
        loading: '正在加载偏好设置...'
    },
    'en-GB': {
        preferences: 'Preferences',
        language: 'Language',
        languageDescription: 'Choose your preferred interface language',
        responseType: 'Response Type',
        responseTypeDescription: 'Full responses include detailed analysis; Brief responses are concise',
        fullResponses: 'Full Responses',
        briefResponses: 'Brief Responses',
        voice: 'Voice Responses',
        voiceDescription: 'Enable audio responses from the oracle',
        voiceOn: 'On',
        voiceOff: 'Off',
        save: 'Save',
        cancel: 'Cancel',
        saving: 'Saving...',
        saved: 'Preferences saved successfully!',
        error: 'Error saving preferences',
        loading: 'Loading preferences...'
    }
};

/**
 * Get translation string for current language
 * @param {string} language - Language code (e.g., 'en-US')
 * @param {string} key - Translation key
 * @returns {string} Translated string or key if not found
 */
export function t(language, key) {
    return translations[language]?.[key] || translations['en-US']?.[key] || key;
}
