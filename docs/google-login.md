# Google-login til StudyBoss

Appen bruger det eksisterende Supabase-projekt StudyBoss, reference
`ytmosjreydqayjrkcfwy`. Google skal aktiveres, før login virker.

1. Åbn https://console.cloud.google.com/ og opret eller vælg et projekt til StudyBoss.
2. Åbn Google Auth Platform. Udfyld Branding med appnavnet StudyBoss samt din support- og kontaktmail. Vælg External under Audience, så andre Google-brugere kan logge ind.
3. Under Data Access bruges kun de almindelige loginoplysninger: OpenID, email og profile. Der skal ikke gives adgang til Drive, Gmail eller andre Google-data.
4. Under Clients opretter du en OAuth client af typen Web application med navnet StudyBoss.
5. Authorized JavaScript origins: tilføj din offentlige StudyBoss-adresse fra Vercel (kun https://domæne, uden sti). Til lokal udvikling kan http://127.0.0.1:5173 tilføjes.
6. Authorized redirect URIs: indsæt præcis:

   `https://ytmosjreydqayjrkcfwy.supabase.co/auth/v1/callback`

7. Opret klienten. Kopiér Client ID og Client Secret direkte til Google-providerens felter i https://supabase.com/dashboard/project/ytmosjreydqayjrkcfwy/auth/providers. Aktivér Google og gem. Hemmeligheden skal ikke i GitHub, frontendkode eller chatten.
8. I Supabase → Authentication → URL Configuration sætter du Site URL til din offentlige StudyBoss-adresse. Tilføj samme adresse med afsluttende / under Redirect URLs. Til lokal udvikling kan http://127.0.0.1:5173/ tilføjes. Brug konkrete adresser frem for brede wildcards.
9. Så længe Googles app står i Testing, tilføjes de ønskede Google-konti som testbrugere under Audience. Vælg Publish app / In production, når din mor og klassekammerater skal kunne bruge deres egne konti uden en testliste.
10. Test på den offentlige hjemmeside: Log ind → Fortsæt med Google. Under Min profil vælger du Føj mine lokale fag til profilen for at tage eksisterende fag med. Åbn derefter hjemmesiden på en anden computer og log ind på samme Google-konto.

## Gemning

Uden login bruges den hidtidige lokale fagoversigt. Hver konto har sin egen lokale cache og sin egen private databasepost med adgangskontrol. At logge ud åbner den oprindelige lokale oversigt igen.

Ændringer gemmes lokalt først og synkroniseres efter en kort pause, samt ved genoprettet internetforbindelse. Brug Synkroniser eller genindlæs siden for at hente nye ændringer fra en anden computer. Ved samtidige ændringer stopper online gemning, indtil brugeren vælger Behold begge versioner. Forskellige udgaver af samme fag bevares som separate fag. Der foretages ingen automatisk sammenblanding af modstridende besvarelser eller medaljer.

Profilen indeholder fag, udtrukket materialetekst, noter, samtaler og træningsdata. Originale PDF-filer og AI-modeldownloads synkroniseres ikke. Der er en grænse på 20 MB pr. profil; ved overskridelse bevares data lokalt, og appen viser en fejl.

Lokal data bliver liggende efter logout. Brug egen browserprofil på delte computere. Der er ikke bygget en kontosletningsfunktion i denne ændring.

## Database

`database/profile-schema.sql` dokumenterer den anvendte migration `private_studyboss_profiles`. Den er allerede anvendt på projektet og skal ikke genkøres manuelt. Den nye tabel er `public.studyboss_profiles`; ældre tabeller er ikke ændret. Kun en public publishable key ligger i frontendkoden. Google Client Secret opbevares i Supabase.

Kilde: https://supabase.com/docs/guides/auth/social-login/auth-google
