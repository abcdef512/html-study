import {EditorState, Compartment} from '@codemirror/state';
import {EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine} from '@codemirror/view';
import {defaultKeymap, history, historyKeymap, undo, redo, indentWithTab} from '@codemirror/commands';
import {html} from '@codemirror/lang-html';
import {syntaxHighlighting, defaultHighlightStyle, indentOnInput, bracketMatching} from '@codemirror/language';
export function createEditor(parent, source, onChange) {
  const tools=document.createElement('div');tools.className='editor-tools';
  const host=document.createElement('div');parent.append(tools,host);
  const wrapping=new Compartment();
  const extensions = [
    lineNumbers(),highlightActiveLineGutter(),highlightActiveLine(),history(),html(),indentOnInput(),bracketMatching(),syntaxHighlighting(defaultHighlightStyle),
    keymap.of([indentWithTab,...defaultKeymap,...historyKeymap]),wrapping.of([]),
    EditorView.contentAttributes.of({'aria-label':'HTML 소스 편집기','spellcheck':'false','autocapitalize':'off'}),
    EditorView.updateListener.of(update=>{if(update.docChanged)onChange(update.state.doc.toString());})
  ];
  const view=new EditorView({parent:host,state:EditorState.create({doc:source,extensions})});
  const button=(label,action)=>{const el=document.createElement('button');el.textContent=label;el.type='button';el.onmousedown=event=>event.preventDefault();el.onclick=()=>{action();view.focus();};tools.append(el);};
  button('실행 취소',()=>undo(view));button('다시 실행',()=>redo(view));
  for(const symbol of ['Tab','<','>','{','}'])button(symbol,()=>view.dispatch(view.state.replaceSelection(symbol==='Tab'?'  ':symbol)));
  const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';
  input.onchange=()=>view.dispatch({effects:wrapping.reconfigure(input.checked?EditorView.lineWrapping:[])});label.append(input,'줄바꿈');tools.append(label);
  return {setSource(value){view.setState(EditorState.create({doc:value,extensions}));},focus(){view.focus();},destroy(){view.destroy();},getSource(){return view.state.doc.toString();}};
}
