import { Button, Toggle } from '../../components/ui/Button';
import { Segmented } from '../../components/ui/Segmented';
import { LANGUAGE_OPTIONS, RATE_OPTIONS } from '../../components/panel/Header';
import { Badge } from '../../components/ui/Badge';
import { Icon } from '../../components/ui/Icon';
import {
  ActionRow,
  AmountCard,
  BackLink,
  Card,
  Divider,
  EmptyState,
  GreetingCard,
  Notice,
  SectionTitle,
  StatusBar,
  StepProgress,
  TipRow,
} from '../../components/panel/Blocks';
import { LineItem } from '../../components/panel/LineItem';
import { RecapCard } from '../../components/panel/RecapCard';
import { FormCard } from '../../components/panel/FormCard';
import type { EdimaSettings } from '../../utils/settings';
import type { FieldDescription, LanguageCode, TranslatedLine } from '../../utils/messages';
import type { RecapInfo } from '../../utils/recap';
import type { StepInfo } from '../../utils/journey';

export type View = 'home' | 'read' | 'lines' | 'guide' | 'safety' | 'transparency' | 'settings';

export interface ViewContext {
  lines: TranslatedLine[];
  step: StepInfo | null;
  formFields: FieldDescription[];
  recap: RecapInfo | null;
  /** French — what the voice reads. */
  summary: string;
  /** What the screen shows: template sentences in the chosen language. */
  summaryDisplay: string;
  online: boolean;
  settings: EdimaSettings;
  language: LanguageCode;
  playingKey: string | null;
  showAllOriginal: boolean;
  expandedLines: Set<string>;
  expandedExplanations: Set<string>;
  go: (view: View) => void;
  /** `text` is French; `clipFor` is the French source of a native-language clip to prefer. */
  speak: (key: string, text: string, clipFor?: string) => void;
  toggleOriginal: (key: string) => void;
  toggleExplanation: (key: string) => void;
  updateSettings: (patch: Partial<EdimaSettings>) => void;
  changeLanguage: (next: LanguageCode) => void;
  /** D10 AI pass (F-4): the translated {simple, example}, or null when none
   * (AI off, not yet requested, or the request failed) — LineItem then
   * falls back to the French original with no "IA" badge. */
  explanationOverride: (original: string) => { simple: string; example: string } | null;
  explanationLoading: (original: string) => boolean;
}

const GREETING = 'Je suis Edima. Je suis là pour t’aider. Que veux-tu faire ?';

export function HomeView(ctx: ViewContext) {
  return (
    <>
      <GreetingCard playing={ctx.playingKey === 'greeting'} onListen={() => ctx.speak('greeting', GREETING)} />
      {!ctx.online && <Notice tone="info">Pas de connexion Internet. Je continue avec les mots que je connais déjà.</Notice>}
      <Card>
        <ActionRow icon="audio" tone="success" title="Lis-moi cette page" subtitle="Je lis et j’explique ce que tu vois." onClick={() => ctx.go('read')} />
        <Divider />
        <ActionRow icon="route" tone="warning" title="Guide-moi étape par étape" subtitle="Je t’explique chaque case du formulaire." onClick={() => ctx.go('guide')} />
        <Divider />
        <ActionRow icon="shield" tone="info" title="Conseils de sécurité" subtitle="Les règles importantes pour te protéger." onClick={() => ctx.go('safety')} />
      </Card>
      <StatusBar status="Edima attend ton choix." hint="Clique sur une option ci-dessus." />
      <button type="button" class="settings-link" onClick={() => ctx.go('settings')}>
        <Icon name="settings" size={18} />
        Réglages
      </button>
    </>
  );
}

/** Line shown with the global "Voir en français" switch applied (D9). */
function displayed(line: TranslatedLine, showAllOriginal: boolean): TranslatedLine {
  return showAllOriginal ? { ...line, text: line.original, source: 'original' } : line;
}

function LineList({ ctx, lines }: { ctx: ViewContext; lines: TranslatedLine[] }) {
  return (
    <ul class="card line-list">
      {lines.map((raw, i) => {
        const line = displayed(raw, ctx.showAllOriginal);
        const key = `line-${raw.original}`;
        return (
          <div key={raw.original}>
            {i > 0 && <Divider />}
            <LineItem
              line={line}
              showOriginal={ctx.expandedLines.has(raw.original)}
              showExplanation={ctx.expandedExplanations.has(raw.original)}
              explanationOverride={ctx.explanationOverride(raw.original)}
              explanationLoading={ctx.explanationLoading(raw.original)}
              playing={ctx.playingKey === key}
              onToggleOriginal={() => ctx.toggleOriginal(raw.original)}
              onToggleExplanation={() => ctx.toggleExplanation(raw.original)}
              onListen={() => ctx.speak(key, raw.spokenAmount ? `${raw.original}. ${raw.spokenAmount}` : raw.original, raw.original)}
            />
          </div>
        );
      })}
    </ul>
  );
}

export function ReadView(ctx: ViewContext) {
  const amountLine = ctx.lines.find((l) => l.spokenAmount);
  const labelIndex = amountLine ? ctx.lines.indexOf(amountLine) - 1 : -1;
  const amountLabel = labelIndex >= 0 && !ctx.lines[labelIndex]!.spokenAmount ? ctx.lines[labelIndex]!.original : 'Montant sur la page';
  const nothingTranslated = ctx.lines.length > 0 && ctx.lines.every((l) => l.source === 'original');
  const preview = ctx.lines.filter((l) => l !== amountLine).slice(0, 3);

  return (
    <>
      <BackLink label="Accueil" onClick={() => ctx.go('home')} />
      <SectionTitle title="Résumé de la page" />
      {amountLine && (
        <AmountCard
          line={displayed(amountLine, ctx.showAllOriginal)}
          label={amountLabel}
          playing={ctx.playingKey === 'amount'}
          onListen={() => ctx.speak('amount', `${amountLabel} : ${amountLine.spokenAmount ?? amountLine.text}`)}
        />
      )}
      {ctx.summary && (
        <section class="readout">
          <p class="caps">Ce que je lis à voix haute</p>
          <p>{ctx.showAllOriginal ? ctx.summary : ctx.summaryDisplay}</p>
          {!ctx.showAllOriginal && ctx.summaryDisplay !== ctx.summary && <Badge source="a_valider" />}
        </section>
      )}
      {nothingTranslated && <Notice tone="info">Les mots de cette page n’ont pas encore de traduction. Je te les lis en français.</Notice>}
      {ctx.lines.length > 0 && (
        <>
          <SectionTitle title="Éléments de cette page" trailing={String(ctx.lines.length)} />
          <LineList ctx={ctx} lines={preview} />
          {ctx.lines.length > preview.length && (
            <Button variant="ghost" onClick={() => ctx.go('lines')}>
              Voir les {ctx.lines.length} éléments
            </Button>
          )}
        </>
      )}
    </>
  );
}

export function LinesView(ctx: ViewContext) {
  return (
    <>
      <BackLink label="Résumé de la page" onClick={() => ctx.go('read')} />
      <SectionTitle title="Éléments de cette page" trailing={String(ctx.lines.length)} />
      <LineList ctx={ctx} lines={ctx.lines} />
      <p class="hint">Touche une ligne traduite pour voir le texte original. Touche « ? » pour l’explication d’un mot difficile.</p>
    </>
  );
}

export function GuideView(ctx: ViewContext) {
  const { step, recap, formFields } = ctx;
  return (
    <>
      <BackLink label="Accueil" onClick={() => ctx.go('home')} />
      {step && <StepProgress step={step} />}
      {recap ? (
        <>
          <RecapCard recap={recap} playingKey={ctx.playingKey} onListen={ctx.speak} />
          <Notice tone="warning">Edima ne clique jamais à ta place. Si tout est juste, clique toi-même sur « Confirmer » sur le site.</Notice>
        </>
      ) : step?.id === 'formulaire' && formFields.length > 0 ? (
        <>
          <p class="lead">Je t’explique chaque case du formulaire. Remplis-les toi-même sur le site.</p>
          <FormCard fields={formFields} playingKey={ctx.playingKey} onListen={ctx.speak} />
        </>
      ) : step?.id === 'solde' ? (
        <Notice tone="info">Tu es sur la page de ton solde. Pour envoyer de l’argent, clique sur « Envoyer » ou « Virement » sur le site : je t’expliquerai le formulaire.</Notice>
      ) : (
        <EmptyState mascot="question" title="Pas de formulaire ici">
          Ouvre la page de virement ou de transfert sur le site de ta banque. Je t’expliquerai chaque case.
        </EmptyState>
      )}
    </>
  );
}

const TIPS = [
  { icon: 'lock', title: 'Ton code secret est à toi seul', detail: 'Personne de la banque ne te le demandera, ni au téléphone ni par message.' },
  { icon: 'phone', title: 'Méfie-toi des appels urgents', detail: 'Si on te presse d’envoyer de l’argent, raccroche et appelle ta banque toi-même.' },
  { icon: 'check-circle', title: 'Vérifie le nom avant d’envoyer', detail: 'Regarde toujours le nom et le numéro du bénéficiaire sur le récapitulatif.' },
  { icon: 'eye', title: 'Cache ton écran', detail: 'Ne laisse personne regarder quand tu tapes ton code.' },
] as const;

export function SafetyView(ctx: ViewContext) {
  const all = TIPS.map((t) => `${t.title}. ${t.detail}`).join(' ');
  return (
    <>
      <BackLink label="Accueil" onClick={() => ctx.go('home')} />
      <h2 class="view-title">Conseils de sécurité</h2>
      <Card>
        {TIPS.map((t, i) => (
          <div key={t.title}>
            {i > 0 && <Divider />}
            <TipRow icon={t.icon} title={t.title} detail={t.detail} playing={ctx.playingKey === `tip-${i}`} onListen={() => ctx.speak(`tip-${i}`, `${t.title}. ${t.detail}`)} />
          </div>
        ))}
      </Card>
      <Button variant="primary" icon={ctx.playingKey === 'tips' ? 'pause' : 'volume'} onClick={() => ctx.speak('tips', all)}>
        Écouter tous les conseils
      </Button>
    </>
  );
}

export function TransparencyView(ctx: ViewContext) {
  const count = (s: TranslatedLine['source']) => ctx.lines.filter((l) => l.source === s).length;
  const rows: { source: TranslatedLine['source']; text: string }[] = [
    { source: 'glossaire', text: 'Un linguiste a vérifié ce mot ou cette phrase.' },
    { source: 'a_valider', text: 'Traduction proposée par un locuteur, pas encore relue par un linguiste.' },
    { source: 'ia', text: 'Traduit par une intelligence artificielle. Peut contenir des erreurs.' },
    { source: 'original', text: 'Pas encore de traduction : Edima montre le français de la banque.' },
  ];
  return (
    <>
      <BackLink label="Résumé de la page" onClick={() => ctx.go('read')} />
      <h2 class="view-title">D’où viennent les traductions ?</h2>
      <Card>
        {rows.map((r, i) => (
          <div key={r.source}>
            {i > 0 && <Divider />}
            <div class="transparency-row">
              <Badge source={r.source} />
              <p>{r.text}</p>
              <p class="transparency-count">{count(r.source)} sur cette page</p>
            </div>
          </div>
        ))}
      </Card>
      <Notice tone="success">Les montants, numéros, noms et références ne sont jamais traduits : Edima les recopie tels quels et vérifie qu’ils n’ont pas changé.</Notice>
      <Notice tone="info">
        La voix française est celle de ton ordinateur : rien n’est envoyé sur Internet. Les mots en duala sont dits par une voix de synthèse, pas encore relue par un locuteur.
      </Notice>
    </>
  );
}

export function SettingsView(ctx: ViewContext) {
  const systemDark = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = ctx.settings.theme ? ctx.settings.theme === 'dark' : systemDark;
  return (
    <>
      <BackLink label="Accueil" onClick={() => ctx.go('home')} />
      <h2 class="view-title">Réglages</h2>
      <Card>
        <div class="setting-block">
          <p class="setting-title">
            <Icon name="globe" size={22} />
            Langue
          </p>
          <Segmented
            label="Langue"
            options={LANGUAGE_OPTIONS.map((o) => ({ value: o.value, label: o.sublabel!, sublabel: o.label }))}
            value={ctx.language}
            onChange={ctx.changeLanguage}
          />
        </div>
        <Divider />
        <div class="setting-block">
          <p class="setting-title">
            <Icon name="gauge" size={22} />
            Vitesse de lecture
          </p>
          <Segmented
            label="Vitesse de lecture"
            options={RATE_OPTIONS.map((o) => ({ value: o.value, label: o.label, sublabel: o.sublabel }))}
            value={ctx.settings.rateIndex}
            onChange={(v) => ctx.updateSettings({ rateIndex: v })}
          />
        </div>
        <Divider />
        <div class="row">
          <Icon name="user" size={22} />
          <div class="row-text">
            <p class="row-title">Mascotte sur les sites de banque</p>
            <p class="row-detail">Un clic sur elle ouvre Edima.</p>
          </div>
          <Toggle checked={ctx.settings.showMascot} label="Mascotte sur les sites de banque" onChange={(v) => ctx.updateSettings({ showMascot: v })} />
        </div>
        <Divider />
        <div class="row">
          <Icon name="file-text" size={22} />
          <div class="row-text">
            <p class="row-title">Traduire dans la page</p>
            <p class="row-detail">Remplace les libellés du site par leur traduction. Les montants, noms, numéros et ce que tu tapes ne changent jamais.</p>
          </div>
          <Toggle checked={ctx.settings.inPage} label="Traduire dans la page" onChange={(v) => ctx.updateSettings({ inPage: v })} />
        </div>
        <Divider />
        <div class="row">
          <Icon name="help" size={22} />
          <div class="row-text">
            <p class="row-title">Traduction IA (expérimentale)</p>
            <p class="row-detail">Traduit les phrases inconnues avec un modèle installé sur cet ordinateur. Résultat non vérifié, toujours signalé.</p>
          </div>
          <Toggle checked={ctx.settings.aiEnabled} label="Traduction IA expérimentale" onChange={(v) => ctx.updateSettings({ aiEnabled: v })} />
        </div>
        <Divider />
        <div class="row">
          <Icon name="moon" size={22} />
          <div class="row-text">
            <p class="row-title">Mode sombre</p>
            <p class="row-detail">Plus doux pour les yeux le soir.</p>
          </div>
          <Toggle checked={dark} label="Mode sombre" onChange={(v) => ctx.updateSettings({ theme: v ? 'dark' : 'light' })} />
        </div>
      </Card>
      <p class="hint">Edima ne remplace pas ta banque : en cas de doute, appelle-la.</p>
    </>
  );
}

export function PanelFooter({ showAllOriginal, onToggleOriginal, onTransparency }: { showAllOriginal: boolean; onToggleOriginal: () => void; onTransparency: () => void }) {
  return (
    <footer class="panel-footer">
      <Button variant="secondary" icon="eye" onClick={onToggleOriginal}>
        {showAllOriginal ? 'Voir la traduction' : 'Voir en français'}
      </Button>
      <Button variant="secondary" icon="shield" onClick={onTransparency}>
        Transparence
      </Button>
    </footer>
  );
}
