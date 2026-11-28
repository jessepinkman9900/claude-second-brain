import{t as e}from"./chunk-JWPE2WC7-CMSs4E6i.js";import{Fn as t,In as n,Jn as r,Ln as i,Lt as a,Mn as o,Pn as s,Yn as c,Zn as l,cr as u,dr as d,kn as f,xn as p,zn as m}from"./mermaid.core-DTuUkAF8.js";import{n as h}from"./mermaid-parser.core-DDwHwS2V.js";var g=s.packet,_=class{constructor(){this.packet=[],this.setAccTitle=c,this.getAccTitle=n,this.setDiagramTitle=l,this.getDiagramTitle=m,this.getAccDescription=t,this.setAccDescription=r}static{d(this,`PacketDB`)}getConfig(){let e=a({...g,...i().packet});return e.showBits&&(e.paddingY+=10),e}getPacket(){return this.packet}pushWord(e){e.length>0&&this.packet.push(e)}clear(){f(),this.packet=[]}},v=1e4,y=d((t,n)=>{e(t,n);let r=-1,i=[],a=1,{bitsPerRow:o}=n.getConfig();for(let{start:e,end:s,bits:c,label:l}of t.blocks){if(e!==void 0&&s!==void 0&&s<e)throw Error(`Packet block ${e} - ${s} is invalid. End must be greater than start.`);if(e??=r+1,e!==r+1)throw Error(`Packet block ${e} - ${s??e} is not contiguous. It should start from ${r+1}.`);if(c===0)throw Error(`Packet block ${e} is invalid. Cannot have a zero bit field.`);for(s??=e+(c??1)-1,c??=s-e+1,r=s,u.debug(`Packet block ${e} - ${r} with label ${l}`);i.length<=o+1&&n.getPacket().length<v;){let[t,r]=b({start:e,end:s,bits:c,label:l},a,o);if(i.push(t),t.end+1===a*o&&(n.pushWord(i),i=[],a++),!r)break;({start:e,end:s,bits:c,label:l}=r)}}n.pushWord(i)},`populate`),b=d((e,t,n)=>{if(e.start===void 0)throw Error(`start should have been set during first phase`);if(e.end===void 0)throw Error(`end should have been set during first phase`);if(e.start>e.end)throw Error(`Block start ${e.start} is greater than block end ${e.end}.`);if(e.end+1<=t*n)return[e,void 0];let r=t*n-1,i=t*n;return[{start:e.start,end:r,label:e.label,bits:r-e.start},{start:i,end:e.end,label:e.label,bits:e.end-i}]},`getNextFittingBlock`),x={parser:{yy:void 0},parse:d(async e=>{let t=await h(`packet`,e),n=x.parser?.yy;if(!(n instanceof _))throw Error(`parser.parser?.yy was not a PacketDB. This is due to a bug within Mermaid, please report this issue at https://github.com/mermaid-js/mermaid/issues.`);u.debug(t),y(t,n)},`parse`)},S=d((e,t,n,r)=>{let i=r.db,a=i.getConfig(),{rowHeight:s,paddingY:c,bitWidth:l,bitsPerRow:u}=a,d=i.getPacket(),f=i.getDiagramTitle(),m=s+c,h=m*(d.length+1)-(f?0:s),g=l*u+2,_=p(t);_.attr(`viewBox`,`0 0 ${g} ${h}`),o(_,h,g,a.useMaxWidth);for(let[e,t]of d.entries())C(_,t,e,a);_.append(`text`).text(f).attr(`x`,g/2).attr(`y`,h-m/2).attr(`dominant-baseline`,`middle`).attr(`text-anchor`,`middle`).attr(`class`,`packetTitle`)},`draw`),C=d((e,t,n,{rowHeight:r,paddingX:i,paddingY:a,bitWidth:o,bitsPerRow:s,showBits:c})=>{let l=e.append(`g`),u=n*(r+a)+a;for(let e of t){let t=e.start%s*o+1,n=(e.end-e.start+1)*o-i;if(l.append(`rect`).attr(`x`,t).attr(`y`,u).attr(`width`,n).attr(`height`,r).attr(`class`,`packetBlock`),l.append(`text`).attr(`x`,t+n/2).attr(`y`,u+r/2).attr(`class`,`packetLabel`).attr(`dominant-baseline`,`middle`).attr(`text-anchor`,`middle`).text(e.label),!c)continue;let a=e.end===e.start,d=u-2;l.append(`text`).attr(`x`,t+(a?n/2:0)).attr(`y`,d).attr(`class`,`packetByte start`).attr(`dominant-baseline`,`auto`).attr(`text-anchor`,a?`middle`:`start`).text(e.start),a||l.append(`text`).attr(`x`,t+n).attr(`y`,d).attr(`class`,`packetByte end`).attr(`dominant-baseline`,`auto`).attr(`text-anchor`,`end`).text(e.end)}},`drawWord`),w={draw:S},T={byteFontSize:`10px`,startByteColor:`black`,endByteColor:`black`,labelColor:`black`,labelFontSize:`12px`,titleColor:`black`,titleFontSize:`14px`,blockStrokeColor:`black`,blockStrokeWidth:`1`,blockFillColor:`#efefef`},E={parser:x,get db(){return new _},renderer:w,styles:d(({packet:e}={})=>{let t=a(T,e);return`
	.packetByte {
		font-size: ${t.byteFontSize};
	}
	.packetByte.start {
		fill: ${t.startByteColor};
	}
	.packetByte.end {
		fill: ${t.endByteColor};
	}
	.packetLabel {
		fill: ${t.labelColor};
		font-size: ${t.labelFontSize};
	}
	.packetTitle {
		fill: ${t.titleColor};
		font-size: ${t.titleFontSize};
	}
	.packetBlock {
		stroke: ${t.blockStrokeColor};
		stroke-width: ${t.blockStrokeWidth};
		fill: ${t.blockFillColor};
	}
	`},`styles`)};export{E as diagram};