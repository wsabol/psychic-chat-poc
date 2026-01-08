# Script to update translation files with new settings keys

$languages = @{
    'en-US' = @{
        'saveSuccess' = 'Settings saved successfully'
        'saveError' = 'Failed to save settings. Please try again.'
    }
    'de-DE' = @{
        'saveSuccess' = 'Einstellungen erfolgreich gespeichert'
        'saveError' = 'Einstellungen konnten nicht gespeichert werden. Bitte versuchen Sie es erneut.'
    }
    'es-ES' = @{
        'saveSuccess' = 'Configuración guardada exitosamente'
        'saveError' = 'Error al guardar la configuración. Por favor, inténtelo de nuevo.'
    }
    'fr-FR' = @{
        'saveSuccess' = 'Paramètres enregistrés avec succès'
        'saveError' = 'Impossible de enregistrer les paramètres. Veuillez réessayer.'
    }
    'it-IT' = @{
        'saveSuccess' = 'Impostazioni salvate con successo'
        'saveError' = 'Errore nel salvataggio delle impostazioni. Per favore, riprova.'
    }
    'ja-JP' = @{
        'saveSuccess' = '設定が正常に保存されました'
        'saveError' = '設定を保存できませんでした。もう一度お試しください。'
    }
    'pt-BR' = @{
        'saveSuccess' = 'Configurações salvas com sucesso'
        'saveError' = 'Erro ao salvar as configurações. Por favor, tente novamente.'
    }
    'zh-CN' = @{
        'saveSuccess' = '设置保存成功'
        'saveError' = '保存设置失败。请重试。'
    }
}

foreach ($lang in $languages.Keys) {
    $filePath = "client/src/translations/$($lang)-settings.json"
    
    if (Test-Path $filePath) {
        $json = Get-Content $filePath | ConvertFrom-Json
        $json.settings.saveSuccess = $languages[$lang]['saveSuccess']
        $json.settings.saveError = $languages[$lang]['saveError']
        $json | ConvertTo-Json -Depth 10 | Set-Content $filePath
        Write-Host "Updated $lang"
    } else {
        Write-Host "File not found: $filePath"
    }
}

Write-Host "All translation files updated!"
