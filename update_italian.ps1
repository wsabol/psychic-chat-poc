$json = Get-Content 'client/src/translations/it-IT-auth.json' | ConvertFrom-Json
$json | Add-Member -NotePropertyName 'modal' -NotePropertyValue @{
    title='🚀 Progresso dell''Onboarding'
    subtitle='Completa i passaggi richiesti per accedere all''app'
    subtitleComplete='✨ Passaggi richiesti completati!'
    steps=@{
        createAccount=@{title='Crea Account'; description='Account creato'}
        paymentMethod=@{title='Metodo di Pagamento'; description='Aggiungi metodo di pagamento'}
        subscription=@{title='Abbonamento'; description='Acquista abbonamento'}
        personalInfo=@{title='Conosciamoci'; description='Informazioni personali'}
    }
    badges=@{required='Richiesto'; optional='Facoltativo'}
    tooltips=@{
        disabled='Completa prima i passaggi precedenti'
        goToStep='Vai a {{stepTitle}}'
        dragMove='Trascina per spostare, fai clic per espandere'
    }
    buttons=@{minimize='Riduci a icona'; close='Chiudi e vai a Chat'}
    footer=@{
        incomplete='Completa tutti i passaggi per iniziare a utilizzare l''app'
        complete='✨ Onboarding completato! Goditi l''app'
    }
} -PassThru | ConvertTo-Json -Depth 100 | Out-File 'client/src/translations/it-IT-auth.json'
