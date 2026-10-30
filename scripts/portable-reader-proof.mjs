import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {createServer} from "vite";
import {createRequire} from "node:module";

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const root = path.resolve(".portable-reader-proof");
await fs.mkdir(root, {recursive: true});
await fs.cp("scripts/fixtures/chapter-locations", root, {recursive:true});
await fs.writeFile(path.join(root, "index.html"), `<!doctype html><html><head><style>html,body{margin:0;height:100%}#reader{width:100%;height:100vh;position:relative}.readium-navigator-iframe{inset:0;width:100%;height:100%;border:none}</style></head><body><div id="reader"></div><script type="module">
import {EpubNavigator,EpubPreferences} from '@readium/navigator';
import {Manifest,Publication,HttpFetcher,Locator,LocatorLocations,LocatorText} from '@readium/shared';
import * as codec from '${"/@fs/" + path.resolve("src/features/reader/utils/portableLocation.ts")}';
import {LogicalReadingFocus,hasPreciseTarget} from '${"/@fs/" + path.resolve("src/features/reader/utils/logicalReadingFocus.ts")}';
import React from 'react';
import {createRoot} from 'react-dom/client';
import {Provider as ReduxProvider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {ChakraProvider,defaultSystem} from '@chakra-ui/react';
import {JumpToSavedPositionModal} from '${"/@fs/" + path.resolve("src/features/reader/components/JumpToSavedPositionModal.tsx")}';
const map=await (await fetch('/map.json')).json(),base=location.origin+'/';
const manifest=Manifest.deserialize({metadata:{title:'Original shared fixture',language:'en'},links:[],readingOrder:map.resources.map(r=>({href:base+r.href.split('/').map(encodeURIComponent).join('/'),type:'application/xhtml+xml'}))});
const positions=manifest.readingOrder.items.map((item,i)=>new Locator({href:item.href,type:item.type,locations:new LocatorLocations({position:i+1,totalProgression:map.resources[i].start/1679})}));
const nav=new EpubNavigator(document.querySelector('#reader'),new Publication({manifest,fetcher:new HttpFetcher((...args)=>fetch(...args),base)}),{frameLoaded:()=>{},positionChanged:l=>window.current=l.serialize()},positions,positions[0],{preferences:new EpubPreferences({fontSize:Number(new URLSearchParams(location.search).get('font')),columnCount:1}),defaults:{}});
const focus=new LogicalReadingFocus(),goUnderlying=nav.go.bind(nav);
nav.go=(locator,animated,cb)=>{
 focus.clear();
 goUnderlying(locator,animated,async ack=>{
  window.lastAck=ack;
  const ok=ack&&(!hasPreciseTarget(locator)||await focus.select(locator,document.querySelector('#reader'),map,base,()=>new Promise(resolve=>goUnderlying(locator,false,resolve))));
  cb(ok);
 });
};
window.nav=nav;window.map=map;window.codec=codec;
await nav.load();window.ready=true;
window.capture=()=>{
 const frame=[...document.querySelectorAll('iframe')].find(f=>f.contentWindow?.document.body && f.getBoundingClientRect().width>0 && f.contentWindow.document.querySelector('base')?.href===nav.currentLocator.href);
 if(!frame)return null;
 const w=frame.contentWindow,index=codec.canonicalText(w.document),href=codec.canonicalHref(nav.currentLocator.href,base);
 const resource=map.resources.find(r=>r.href===href);
 if(!codec.verifiedResource(map,resource,index))throw new Error('Unverified rendered DOM');
 const actualFirstVisible=codec.firstVisibleOffset(w,index);
 const offset=focus.locator?focus.capture(w,index,map,href):actualFirstVisible;
 if(offset===null)throw new Error('Logical point is not physically visible');
 return {location:codec.capturePortableLocation(map,href,offset),offset,logicalFocus:!!focus.locator,readingLocator:(focus.locator??nav.currentLocator).serialize(),actualFirstVisible:codec.capturePortableLocation(map,href,actualFirstVisible),text:index.text.slice(offset,offset+70),font:w.getComputedStyle(w.document.querySelector('p')).fontSize,fontZoom:w.getComputedStyle(w.document.body).zoom,viewport:[w.innerWidth,w.innerHeight],chapterPage:codec.approximateChapterPage(w,index,map,href,offset,false)};
};
window.resolve=async(chapter,progression)=>{
 const resource=map.resources.find(r=>r.href===chapter.href);
 const location={version:1,formatId:map.formatId,contentHash:map.contentHash,mapFingerprint:map.fingerprint,href:resource.href,resourceProgression:0,chapterId:chapter.id,chapterProgression:progression,basis:'rendered'};
 window.sourceLocation=JSON.stringify(location);
 const target=codec.resolvePortableTarget(map,location);
 if(!target)throw new Error('Unresolved chapter');
 const i=map.resources.findIndex(r=>r.href===target.href);
 const html=await(await fetch(positions[i].href)).text(),index=codec.canonicalText(new DOMParser().parseFromString(html,'text/html'));
 if(!codec.verifiedResource(map,map.resources[i],index))throw new Error('Unverified source text');
 const locator=codec.textLocator(positions[i],index,target.offset,{start:Math.max(0,chapter.start-map.resources[i].start),end:Math.min(index.text.length,chapter.end-map.resources[i].start)});
 if(!locator)throw new Error('Missing unique precise text');
 const ok=await new Promise(resolve=>nav.go(locator,false,resolve));
 const end=Math.min(index.text.length,chapter.end-map.resources[i].start),start=Math.max(0,chapter.start-map.resources[i].start);
 const point=index.points[target.offset]??index.points.slice(target.offset,end).find(Boolean)??index.points.slice(start,target.offset).reverse().find(Boolean);
 return {ok,target,readingOffset:index.points.indexOf(point),global:map.resources[i].start+index.points.indexOf(point),locator:locator.serialize()};
};
window.targetVisible=(href,offset)=>{
 const f=[...document.querySelectorAll('iframe')].find(f=>codec.canonicalHref(f.contentWindow?.document.querySelector('base')?.href??'',base)===href);
 if(!f)return false;
 const w=f.contentWindow,index=codec.canonicalText(w.document),point=index.points[offset];
 if(!point)return false;
 const r=w.document.createRange();r.setStart(point.node,point.offset);r.setEnd(point.node,point.offset+1);
 return [...r.getClientRects()].some(b=>b.right>0&&b.left<w.innerWidth&&b.bottom>0&&b.top<w.innerHeight);
};
window.reflow=async(font)=>{
 if(font)await nav.submitPreferences(new EpubPreferences({fontSize:font,columnCount:1}));
 const locator=focus.locator;
 if(!locator)throw new Error('Layout lost logical focus');
 const ack=await new Promise(resolve=>goUnderlying(locator,false,resolve));
 if(!ack||!await focus.select(locator,document.querySelector('#reader'),map,base,()=>new Promise(resolve=>goUnderlying(locator,false,resolve))))throw new Error('Layout target is not visibly restored');
};
window.turn=async()=>{
 focus.clear();
 return await new Promise(resolve=>nav.goForward(false,resolve));
};
window.preferences=font=>nav.submitPreferences(new EpubPreferences({fontSize:font,columnCount:1}));
window.describeTarget=json=>{
 const locator=Locator.deserialize(json),f=[...document.querySelectorAll('iframe')].find(f=>f.contentWindow?.document.querySelector('base')?.href===locator.href);
 const w=f.contentWindow,index=codec.canonicalText(w.document),at=codec.preciseLocatorOffset(w.document,locator,index),point=index.points[at];
 let rect=null;if(point){const range=w.document.createRange();range.setStart(point.node,point.offset);range.setEnd(point.node,point.offset+1);rect=range.getBoundingClientRect().toJSON();}
 return {at,rect,scope:locator.locations.getCssSelector()?w.document.querySelector(locator.locations.getCssSelector())?.textContent:null,text:index.text.slice(0,20)};
};
window.anchorGo=async(chapter,mode)=>{
 const position=positions[map.resources.findIndex(r=>r.href===chapter.href)];
 const locations=mode==='fragment'?new LocatorLocations({fragments:[chapter.fragment]}):new LocatorLocations({otherLocations:new Map([['cssSelector','[id='+JSON.stringify(chapter.fragment)+']']])});
 return await new Promise(resolve=>nav.go(new Locator({href:position.href,type:position.type,locations}),false,resolve));
};
window.absent=async()=>await new Promise(resolve=>nav.go(new Locator({href:positions[0].href,type:'application/xhtml+xml',text:new LocatorText({highlight:'A completely absent verified reading target zyxwvutsrqponmlkjihgfedcba'})}),false,resolve));
window.openConflict=()=>{
 const el=document.createElement('div');document.body.appendChild(el);const root=createRoot(el);
 const store=configureStore({reducer:()=>({readerTheme:{mode:'dark'}})});
 root.render(React.createElement(ReduxProvider,{store},React.createElement(ChakraProvider,{value:defaultSystem},
 React.createElement(JumpToSavedPositionModal,{open:true,modalCase:{type:'portable',deviceName:'Synthetic KOReader',serverPosition:positions[0],serverLabel:'A deliberately long nested chapter label, approximately 42% through chapter',localWork:true},onJump:()=>root.render(null),onKeepLocal:()=>root.render(null),onClose:()=>root.render(null)}))));
};
</script></body></html>`);
const server = await createServer({configFile:false,root,cacheDir:path.join(root,"cache"),
    resolve:{alias:{"@":path.resolve("src"),"@readium/navigator":path.resolve("node_modules/@readium/navigator/dist/index.js"),"@readium/shared":path.resolve("node_modules/@readium/shared/dist/index.js")}},
    server:{host:"127.0.0.1",port:15474,strictPort:true,fs:{allow:[process.cwd()]}}});
let browser;
try {
    await server.listen();
    assert((await fetch("http://127.0.0.1:15474/")).ok);
    browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",headless:true});
    const results=[];
    const anchorChecks=[], absentResults=[];
    for (const [width,font] of [[390,1],[1024,1.6]]) {
        const page=await browser.newPage({viewport:{width,height:520}});
        const errors=[];
        page.on("pageerror",error=>errors.push(error.message));
        await page.goto(`http://127.0.0.1:15474/?font=${font}`);
        await page.waitForFunction(()=>window.ready);
        const chapters=await page.evaluate(()=>window.map.chapters);
        for(const chapter of chapters) for (const progression of [0,0.5,1]) {
            const resolved=await page.evaluate(([ch,p])=>window.resolve(ch,p),[chapter,progression]);
            assert(resolved.ok,JSON.stringify({width,font,chapter:chapter.id,progression,resolved,detail:await page.evaluate(json=>window.describeTarget(json),resolved.locator)}));
            assert(resolved.global>=chapter.start && resolved.global<chapter.end,"Target escaped intended half-open section");
            await page.waitForTimeout(160);
            assert(await page.evaluate(([href,offset])=>window.targetVisible(href,offset),[resolved.target.href,resolved.readingOffset]),"Readium did not actually show the bounded target passage");
            const captured=await page.evaluate(()=>window.capture());
            assert(captured?.location,"No verified first-visible point");
            assert.equal(captured.viewport[0],width);
            assert.equal(Number(captured.fontZoom),font,"Readium must actually apply different font scaling");
            assert.equal(captured.location.chapterId,chapter.id,"Applied jump lost the selected logical section");
            assert(captured.logicalFocus);
            const source=await page.evaluate(()=>window.sourceLocation);
            await page.evaluate(font=>window.reflow(font),font===1?1.3:1.9);
            const afterFont=await page.evaluate(()=>window.capture());
            assert.equal(afterFont.location.chapterId,chapter.id,"Font repagination discarded logical focus");
            await page.setViewportSize({width:width+43,height:560});
            await page.waitForTimeout(200);
            await page.evaluate(()=>window.reflow());
            const afterViewport=await page.evaluate(()=>window.capture());
            assert.equal(afterViewport.location.chapterId,chapter.id,"Viewport repagination discarded logical focus");
            assert.equal(await page.evaluate(()=>window.sourceLocation),source,"A generated coordinate overwrote the source");
            await page.evaluate(()=>window.turn());
            await page.waitForTimeout(120);
            const afterTurn=await page.evaluate(()=>window.capture());
            assert(!afterTurn.logicalFocus);
            assert.deepEqual(afterTurn.location,afterTurn.actualFirstVisible,"Intentional page turn did not resume actual DOM capture");
            results.push({width,font,chapter:chapter.id,progression,target:resolved.target,global:resolved.global,captured,afterFont,afterViewport,afterTurn});
            await page.setViewportSize({width,height:520});
            await page.evaluate(font=>window.preferences(font),font);
        }
        // Verify a real reading point in the continuation maps to the cross-resource chapter.
        const continuation=await page.evaluate(async()=>{
            const ch=window.map.chapters.find(ch=>ch.id.endsWith('#long'));
            await window.resolve(ch,0.95);
            return true;
        });
        assert(continuation);
        await page.waitForTimeout(200);
        const cross=await page.evaluate(()=>window.capture());
        assert.equal(cross.location.chapterId,"OPS/one.xhtml#long");
        assert.equal(cross.location.href,"OPS/continued chapter.xhtml");
        for(const chapter of chapters) for (const mode of ["fragment","selector"]) {
            assert(await page.evaluate(([ch,mode])=>window.anchorGo(ch,mode),[chapter,mode]));
            const captured=await page.evaluate(()=>window.capture());
            assert.equal(captured.location.chapterId,chapter.id,mode+" jump lost verified logical section");
            anchorChecks.push({width,font,mode,chapter:chapter.id,captured});
        }
        const absent=await page.evaluate(()=>window.absent());
        assert.equal(absent,false,"Physically absent target was accepted as success");
        absentResults.push({width,font,rendererAck:await page.evaluate(()=>window.lastAck),verifiedSuccess:absent});
        assert.deepEqual(errors,[]);
        await page.close();
    }
    const mobile=await browser.newPage({viewport:{width:320,height:640}});
    await mobile.goto("http://127.0.0.1:15474/?font=1");
    await mobile.waitForFunction(()=>window.ready);
    await mobile.evaluate(()=>window.openConflict());
    const dialog=mobile.getByRole("dialog");
    await dialog.waitFor();
    await mobile.waitForTimeout(300);
    const mobileControls=[];
    for (const button of await dialog.getByRole("button").all()) {
        const box=await button.boundingBox();
        assert(box && box.width>=44 && box.height>=44 && box.x>=0 && box.x+box.width<=320,`Mobile prompt touch target overflow: ${await button.innerText()} ${JSON.stringify(box)}`);
        mobileControls.push({label: await button.getAttribute("aria-label") ?? await button.innerText(), box});
    }
    assert(!await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),"Mobile prompt overflow");
    await dialog.getByRole("button",{name:"Use saved position",exact:true}).click();
    await dialog.waitFor({state:"hidden"});
    await mobile.close();
    await fs.mkdir("scripts/evidence",{recursive:true});
    await fs.writeFile("scripts/evidence/portable-reader-proof.json",JSON.stringify(results,null,2)+"\n");
    await fs.writeFile("scripts/evidence/portable-reader-anchors.json",JSON.stringify({executedAt:new Date().toISOString(),browser:browser.version(),anchorChecks,absentResults},null,2)+"\n");
    await fs.writeFile("scripts/evidence/portable-reader-mobile.json",JSON.stringify({executedAt:new Date().toISOString(),browser:browser.version(),viewport:{width:320,height:640},noHorizontalOverflow:true,controls:mobileControls},null,2)+"\n");
    console.log(`Verified ${results.length}/30 applied text jumps and ${anchorChecks.length}/20 fragment/selector jumps retain the exact verified logical section. Text targets survive font/viewport repagination; intentional page turns resume measured DOM capture. Absent targets fail despite renderer ACK; source stays separate. Two layouts and 320px dialog passed.`);
} finally {
    await browser?.close();
    await server.close();
    await fs.rm(root,{recursive:true,force:true});
}
