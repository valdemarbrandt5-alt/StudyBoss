import math
import plotly.graph_objects as go
from calculator import softmax
VISUAL_SCHEMA={'type':'object','properties':{
 'kind':{'type':'string','enum':['steps','bars','curve','network','none']},
 'title':{'type':'string'},'caption':{'type':'string'},
 'labels':{'type':'array','items':{'type':'string'},'maxItems':8},
 'values':{'type':'array','items':{'type':'number'},'maxItems':8},
 'function':{'type':'string','enum':['sigmoid','relu','leaky_relu','tanh','none']}},
 'required':['kind','title','caption','labels','values','function'],'additionalProperties':False}
EXPLANATION={'type':'object','properties':{'answer':{'type':'string'},'visual':VISUAL_SCHEMA},'required':['answer','visual'],'additionalProperties':False}
VISUAL_PROMPT='''Returner JSON med answer (dansk Markdown med LaTex for formler) og visual. Lav ALTID en fagligt relevant figur når mulig: steps med 2 til 6 korte labels for proces eller regnetrin, bars med lige mange labels og numeriske values til sammenligning, curve med function sigmoid/relu/leaky_relu/tanh, network med values som lagstørrelser (højst 6 lag, højst 12 neuroner per lag). Brug title og caption som forklarer hvad figuren viser og om tal er illustrative. Kurver har fast domæne -6 til 6 og leaky_relu hældning 0.01; vælg steps for andre funktioner. Brug none kun hvis figuren ikke hjælper. Ingen billeder eller opdigtede eksterne URLs. Kun eksisterende kilder må citeres.'''

def render_visual(spec,key):
    import streamlit as st
    try:
        kind=spec.get('kind','none')
        if kind=='none': return
        st.markdown('#### '+str(spec.get('title','Se det visuelt')))
        labels=[str(x)[:160] for x in spec.get('labels',[])][:8]
        values=[float(x) for x in spec.get('values',[])][:8]
        fig=None
        if kind=='curve':
            x=[-6+i*0.03 for i in range(401)]
            fn={'sigmoid':lambda v:1/(1+math.exp(-v)), 'relu':lambda v:max(0,v), 'leaky_relu':lambda v:max(0,v)+min(0,v)*.01,'tanh':math.tanh}[spec['function']]
            fig=go.Figure(go.Scatter(x=x,y=[fn(v) for v in x],mode='lines',line=dict(color='#8b7aff',width=4)))
            fig.update_layout(xaxis_title='x',yaxis_title='f(x)')
        elif kind=='bars' and labels and len(labels)==len(values):
            if not all(math.isfinite(v) for v in values): raise ValueError('invalid values')
            fig=go.Figure(go.Bar(x=labels,y=values,marker_color='#8b7aff',text=values,textposition='auto'))
        elif kind=='network' and 2<=len(values)<=6 and all(v.is_integer() and 1<=v<=12 for v in values):
            sizes=[int(v) for v in values]
            fig=go.Figure()
            for layer in range(len(sizes)-1):
                for a in range(sizes[layer]):
                    for b in range(sizes[layer+1]):
                        fig.add_trace(go.Scatter(x=[layer,layer+1],y=[a-(sizes[layer]-1)/2,b-(sizes[layer+1]-1)/2],mode='lines',line=dict(color='rgba(139,122,255,.2)',width=1),hoverinfo='skip',showlegend=False))
            for layer,n in enumerate(sizes):
                fig.add_trace(go.Scatter(x=[layer]*n,y=[i-(n-1)/2 for i in range(n)],mode='markers',marker=dict(color='#8b7aff',size=18),name=f'Lag {layer+1}: {n} neuroner'))
            fig.update_xaxes(visible=False); fig.update_yaxes(visible=False)
        if fig is not None:
            fig.update_layout(height=340,margin=dict(l=20,r=20,t=20,b=30),paper_bgcolor='rgba(0,0,0,0)',plot_bgcolor='rgba(0,0,0,0)')
            st.plotly_chart(fig,use_container_width=True,key=key)
        else:
            # Display bounded text cards when a chart spec cannot be rendered.
            for i,label in enumerate(labels):
                with st.container(border=True): st.markdown(f'**{i+1:02d}**  {label}')
            if not labels: st.caption('Modellen gav ikke nok data til en figur. Bed om et konkret visuelt eksempel.')
        st.caption(str(spec.get('caption','')))
    except (ValueError,KeyError,TypeError,OverflowError):
        st.caption('Figuren kunne ikke tegnes. Bed om et eksempel med tydelige tal eller trin.')
