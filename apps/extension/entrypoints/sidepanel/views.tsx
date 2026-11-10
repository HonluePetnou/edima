import { Button, Toggle } from '../../components/ui/Button';
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
  summary: string;
  online: boolean;
  settings: EdimaSettings;
  language: LanguageCode;
  playingKey: string | null;
  showAllOriginal: boolean;
  expandedLines: Set<string>;
  expandedExplanations: Set<string>;
  go: (view: View) => void;
  speak: (key: string, text: string) => void;
  toggleOriginal: (key: string) => void;
  toggleExplanation: (key: string) => void;
  updateSettings: (patch: Partial<EdimaSettings>) => void;
  changeLanguage: (next: LanguageCode) => void;
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
              playing={ctx.playingKey === key}
              onToggleOriginal={() => ctx.toggleOriginal(raw.original)}
              onToggleExplanation={() => ctx.toggleExplanation(raw.original)}
              onListen={() => ctx.speak(key, line.spokenAmount ? `${line.text}. ${line.spokenAmount}` : line.text)}
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
          <p>{ctx.summary}</p>
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
      <Notice tone="success">Les montants, numéros et dates ne sont jamais traduits : Edima les recopie tels quels et vérifie qu’ils n’ont pas changé.</Notice>
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
        <div class="row">
          <Icon name="globe" size={22} />
          <label class="row-text" for="setting-lang">
            <span class="row-title">Langue</span>
          </label>
          <select id="setting-lang" class="row-select" value={ctx.language} onChange={(e) => ctx.changeLanguage((e.target as HTMLSelectElement).value as LanguageCode)}>
            <option value="ewo">Ewondo</option>
            <option value="dua">Duala</option>
          </select>
        </div>
        <Divider />
        <div class="row">
          <Icon name="gauge" size={22} />
          <label class="row-text" for="setting-rate">
            <span class="row-title">Vitesse de lecture</span>
          </label>
          <select id="setting-rate" class="row-select" value={ctx.settings.rateIndex} onChange={(e) => ctx.updateSettings({ rateIndex: Number((e.target as HTMLSelectElement).value) })}>
            <option value={0}>Normale</option>
            <option value={1}>Lente</option>
            <option value={2}>Très lente</option>
          </select>
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
