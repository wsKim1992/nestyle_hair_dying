let fileName;
let respImgArr;
let respImgArrByte;
let upload_time;
let timer;
let flag = false;
let jcropApi = null;
let originCanvas=null;
let originCanvasURL=null;
let originWidth=0;
let croppedImgURL=null;
let lastWindowWidth;
let lastWindowHeight;
let seg_data;
let hash;
let alpha;
let today_date;
let xhp;
let poolingProcess;
//이미지 다운받아서 로컬 스토리지에 저장...
	$(".fa-download").on("click",function(event){
		console.log("download");
		const imgType = $("#DyedImg").attr("imgtype");
		let a = document.createElement('a');
		let filename = Date.now()+'.png';
		if(imgType=='uploaded'){
			srcBase64=$("#DyedImg").attr("src");
			splitedSrc = srcBase64.split(',')[1];
			srcDecode = atob(splitedSrc);
			let arr = [];
			for(let i = 0;i<srcDecode.length;i++){
				arr.push(srcDecode.charCodeAt(i));
			}
			let blobFile = new Blob([new Uint8Array(arr)],{'type':'image/png'});
			
			if(window.navigator.msSaveBlob){
				window.navigator.msSaveBlob(blobFile,'dyedImg.png');
			}else{			
				$(this).parent('a').attr("href",srcBase64);
				$(this).parent('a').attr("download",filename);
				$(this).parent('a').click();

			}
		}
	})
	$(window).on("resize",function(){
		let width = parseFloat(window.innerWidth);
		let height = parseFloat(window.innerHeight);
		let flag=false;
		/* console.log("window_width : "+width);
		console.log("window_height : "+height);
		 */
		if(window.innerWidth>800){
			$("#jcropImg").css({"width":screen.width,"height":screen.height});
			if(lastWindowWidth<=800){flag=true;}

		}else if(window.innerWidth<=800){
			$("#jcropImg").css({"width":window.innerWidth,"height":window.innerHeight});
			if(lastWindowWidth>800){flag=true;}
		}
		if(flag==true){
			if(jcropApi!=null){
				jcropApi.destroy();
				jcropApi=null;
			}
			
			let src = $("#editImg").attr("src");
			console.log(src);

			canvasDrawImage(src,function(){},false)
			.then((result,reject)=>{imgCropDesignate(result)});
		}
		lastWindowWidth=width;
		lastWindowHeight=height;

	})

    $("#jcropImg .resize_btn").on("click",function(){
        const id = $(this).attr("id");
        let xAxis =parseFloat($("#xAxis").val());
        let yAxis = parseFloat($("#yAxis").val());
        let wLength=parseFloat($("#wLength").val());
        let hLength=parseFloat($("#hLength").val());
        console.log(xAxis);console.log(yAxis);
        let newHLength;let newWLength; let x1Offset;let y1Offset;
        if(id=='plusBtn'){
            newHLength = hLength*1.25;
        }else if(id=='minusBtn'){
            newHLength = hLength*0.8;
        }
        if(newHLength>=512){newHLength=512;}
        newWLength = newHLength;
        x1Offset = (wLength-newWLength)/2;
        y1Offset = (hLength-newHLength)/2;
        //console.log("nH : "+newHLength+" nW : "+newWLength+" x1Off : "+x1Offset +" y1Off : "+y1Offset);

        let newX1=xAxis+x1Offset;
        let newY1=yAxis+y1Offset;
        let newX2= xAxis+newWLength;
        let newY2=yAxis+newHLength;
        //console.log("x1 : "+newX1+" y1 : "+newY1+" x2 : "+newX2 +" y2 : "+newY2);

        $("#editImg").Jcrop({
            bgFade:true,
            bgOpacity:0.5,
            aspectRatio:1,
            allowResize:true,
            onSelect:uploadCoords,
            setSelect:[newX1,newY1,newX2,newY2]
        });
    })

	$("#jcropImg .fa-undo-alt").on("click",function(e){
		jcropApi.destroy();
		jcropApi=null;
		$("#jcropImg").hide();
	})
	//캔버스 이미지를 저장 후 서버에 전송하는 기능
	async function saveAndSendCanvas(canvas){
		//Canvas 이미지를 데이터로 저장
		//저장된 Canvas 이미지를 base64에서 디코딩
		//디코딩된 값을 바이트 배열로 변환 후 저장
		//typed array인 8bit unsigned array로 변환
		//new blob 생성자를 사용해 blob값으로 변환
		//FormData 생성자를 사용해 이미지 값을 서버의 데이터로 저장
		//ajax의 post 메소드를 사용하여 서버에 전송
		//console.log(canvas.toDataURL("image/png"));
		let dataURI = canvas.toDataURL("image/png");
		croppedImgURL=dataURI
		$("#editImg").attr({"src":""}).css({width:"700px",height:"700px"});
		$("#jcropImg").hide();

		if($("#DyedImg").attr("imgType")=='sample'){
			$("#imgBox>.fa-upload").hide();
			$("#imgBox>.fa-times-circle").show();
		}
		await $("#imgContainer #imgBox #DyedImg").attr({"src": dataURI,"imgType":"uploaded"});
		$("#imgContainer #imgBox #DyedImg").show();

		const lis=$("#imgBtnList>li");
		const liNum = $("#imgBtnList>li").length;
		
		$("#imgBtnList>li>img").removeClass("on");
		$("#downLink").attr({"href":dataURI});
		if(liNum<=6){
			let $li = lis.eq(0).clone(true);
			$li.children('img').attr({"src":dataURI,"imgType":"uploaded","id":"uploaded"}).addClass('on');
			$("#imgBtnList").append($li);
			//alert($li.children('img').attr("src"));
		}else{
			$("#imgBtnList>li>#uploaded").attr({"src":dataURI}).addClass('on');
			
		}
		
	}
	function sleep(ms){
		let wakeupTime= Date.now()+ms;
		while(Date.now()<wakeupTime){}
	}
	
	//캔버스 이미지 생성
	//upload 한 이미지를 canvas 에다 그려주기!!
	function canvasDrawImage(src,callback,mode){
        return new Promise(function(resolve,reject){
            let dataURI;
		    let preImage = new Image();
            let widthAndHeight=null;
			//$("#editImg").attr({"src":src});
			//console.log(src);
			
			let imgWrapWidth = $("#imgWrap").css("width");
			let imgWrapHeight = $("#imgWrap").css("height");
			imgWrapWidth=parseInt(imgWrapWidth.slice(0,imgWrapWidth.indexOf("px")));
			imgWrapHeight=parseInt(imgWrapHeight.slice(0,imgWrapHeight.indexOf("px")));
		
			preImage.src=src;
			
            let originCanvasContext;
            preImage.onload = function(){
				
                let canvas = document.createElement('canvas');
                let canvasContext = canvas.getContext('2d');
				//원본 이미지를 삽입하는 canvas
				if(mode==true){
					originCanvas = document.createElement('canvas');
					originCanvasContext = originCanvas.getContext('2d');
				}
				let width;let height;let margin;
				let top,left;
                if(preImage.width>=preImage.height){

					if(imgWrapWidth==700){width=700;}
                    else if(imgWrapWidth==300){width=300;}
                    height=parseFloat(preImage.height/preImage.width)*width;
					top=(width-height)/2;left=0;
					margin=top;
                }else{
					
					if(imgWrapHeight==700){height=700;}
					else if(imgWrapHeight==300){height=300;}
                    width=parseFloat(preImage.width/preImage.height)*height;
					top=0;left=(height-width)/2;
                }

                canvas.width = width;
				canvas.height= height;
				
				if(mode==true){
					originCanvas.width=preImage.width;
					originCanvas.height=preImage.height;
					originCanvasContext.drawImage(preImage,0,0,originCanvas.width,originCanvas.height);
					originCanvasURL=originCanvas.toDataURL("image/png");
				}
				
                canvasContext.drawImage(preImage,0,0,width,height);
                //canvas의 이미지를 uri(base64)로 인코딩된 형태로 변환...
                dataURI = canvas.toDataURL("image/png");
                //console.log(dataURI);
                $("#editImg").css({"width":width+"px","height":height+"px"}).attr({"src":dataURI});

                widthAndHeight={width:width,height:height};	
                resolve(widthAndHeight);
            }
        });
	}
	
	//이미지 크롭 영역지정 ui 나타내기
	function imgCropDesignate(result){
        let width = result.width;
        let height = result.height;
        
		let edWidth = parseFloat(width);
		let edHeight = parseFloat(height);
		let imgWrapLen = parseFloat($("#imgWrap").width());
			
		let length = Math.min(edWidth,edHeight);
		
		let x;let y;let topOrLeft=''
		
		const jcrpHolderCss={
			"top":'0px',
			"left":"0px",
			"margin":0+'px'
		}
		
		if(length === edWidth){
			x=0; diff = (edHeight-length)/2;
			y=diff;
			jcrpHolderCss["left"]=diff.toString()+"px"
		}else if(length === edHeight){
			y=0; diff = (edWidth-length)/2; 
			x=diff; 
			jcrpHolderCss["top"]=diff.toString()+"px"
			topOrLeft="top";
		}
		
		let x1 = x;
		let y1 = y;
		let y2=y+length;
		let x2=x+length;

		$("#editImg").Jcrop({
			bgFade:true,
			bgOpacity : 0.5,
			allowResize:true,
			setSelect : [x1,y1,x2,y2],
			aspectRatio:1,
			//x1 y1: 시작좌표
			//x2 y2 : 끝좌표
			onSelect : uploadCoords,},
			function(){
				jcropApi=this;
		})
		$("#editImg").css(jcrpHolderCss);
		$(".jcrop-holder").css(jcrpHolderCss);
		//console.log($(".jcrop-holder").css("top"));
		//$(".jcrop-holder").off("click");
		$(".jcrop-holder>.jcrop-tracker").off("mousedown");
		$(".jcrop-dragbar").off("click");
        $(".ord-s").off("click");
        $(".ord-e").off("click");
        $(".ord-w").off("click");
        $(".ord-n").off("click");
	}


	//지정된 크롭 한 영역 의 값을 보관하는 함수
	//parameter로 Jcrop에 설정한 시작 좌표와 높히 너비값이
	//넘겨짐..
	function uploadCoords(crap){

		$("#xAxis").val(crap.x);
		$("#yAxis").val(crap.y);
		$("#wLength").val(crap.w);
		$("#hLength").val(crap.h);
	}
	//지정된 크롭 한 영역 의 값을 보관하는 함수 
	async function imgCropApply(){
		//console.log("jcropApi");
		//console.log(jcropApi);
		if(parseInt($("#wLength").val())=="NaN"){
			//alert("이미지를 크롭한 이후 \n 자르기 버튼을 클릭하세요");
			return false;
		}else{
			let img = new Image();
            img.src = originCanvasURL;
            //$("#editImg").attr("src");
            let xAxis = parseFloat($("#xAxis").val());let yAxis = parseFloat($("#yAxis").val());
            let wLength = parseFloat($("#wLength").val());let hLength = parseFloat($("#hLength").val());
            let x2Axis = xAxis+wLength;let y2Axis = yAxis+hLength;

            let editImgWidth=parseFloat($("#editImg").css("width"));
			let editImgHeight=parseFloat($("#editImg").css("height"));
            
            img.onload= await function(){
				let canvas=document.createElement('canvas');
				let canvasContext=canvas.getContext("2d");
				
				let newXAxis = parseFloat(xAxis/editImgWidth)*parseInt(originCanvas.width);
                let newYAxis = parseFloat(yAxis/editImgHeight)*parseInt(originCanvas.height);
                let newX2Axis = parseFloat(x2Axis/editImgWidth)*parseInt(originCanvas.width);
                let newY2Axis = parseFloat(y2Axis/editImgHeight)*parseInt(originCanvas.height); 
                let newWidth = newX2Axis-newXAxis;let newHeight=newY2Axis-newYAxis;

				canvas.width=newWidth;
				canvas.height=newWidth;
				
				canvasContext.drawImage(
					this,
					newXAxis,//자르기를 시작할 x좌표
					newYAxis,//자르기를 시작할 y좌표
					newWidth,//잘라낸 이미지의 넓이
					newWidth,//잘라낸 이미지의 높이
					0,//캔버스에 이미지를 배치할 x 좌표
					0,//캔버스에 이미지를 배치할 y 좌표
					newWidth,//사용할 이미지의 넓이 
					newHeight//사용할 이미지의 높이
				);

				if(canvas.width>1024){
					let canvasCpy = document.createElement('canvas');
					let cpyCtx = canvasCpy.getContext('2d');

					canvasCpy.width = canvas.width;
					canvasCpy.height = canvas.height;

					let ratio = 1024/canvas.width;

					cpyCtx.drawImage(canvas,0,0);
					canvas.height = canvas.height*ratio;
					canvas.width = canvas.width*ratio;

					canvasContext.drawImage(canvasCpy,0,0,canvasCpy.width,canvasCpy.height,0,0,canvas.width,canvas.height);
				}
				let dataURI = canvas.toDataURL("image/png");
				
				$("#editImg").attr({"src":dataURI});
				//$("#editImg").css({"width":canvas.width,"height":canvas.width});
                saveAndSendCanvas(canvas);
				//originWidth=parseInt(canvas.width);
				originCanvas=null;
			}
            //jcropApi 객체 메모리 해제...
			jcropApi.destroy();
			jcropApi=null;
		}
	}
	/* $("#editBtn").on("click",function(){
		imgCropDesignate();
	})
	$("#cutBtn").on("click",function(){
		impCropApply();
	}); */


	//이미지 절반 나누기&슬라이드
	$("#imgBox>.fa-star-half-alt").on("click",function(){
		const displayMode = $("#imgBox").attr("display_mode");
		const dyedSrc = $("#imgBox>#DyedImg").attr("src");
		const originSrc = $("#originImg").attr("src");
		
		console.log(dyedSrc);console.log(originSrc);
		if(displayMode=='full'){
			$("#imgBox #slideBar").show().css({"left":210+"px","margin-left":"-1px"});
			$("#imgBox #slideImg").show();
			$("#imgBox #slideImg>img").attr({"src":dyedSrc});
			$("#imgBox #DyedImg").attr({"src":originSrc});
			$("#imgBox").attr({"display_mode":"half"});
		}else{
			$("#imgBox #slideBar").hide();
			$("#imgBox #slideImg").hide();
			$("#imgBox").attr({"display_mode":"full"});
			$("#imgBox #DyedImg").attr({"src":dyedSrc});
		}
	})

	$("#imgUploadBtn .fa-times-circle").on("click",function(e){
		$(this).parent().hide();
	})

	$("#imgBtnList>li>img").on("click",function(event){
		$("#imgBtnList>li>img").removeClass("on");
		const id = $("#colorListContainer>.on").attr("for");
		let h_value = $(id).val();
		let src=$(this).attr("src");
		//alert(src);
		$("#colorListContainer label").removeClass("on");
		$("#imgContainer>#imgBox>img").attr("src",src);
		const imgType = $("#DyedImg").attr("imgType");
		if($(this).attr("imgType")=='uploaded'){
			$("#DyedImg").attr({"src":src,"imgType":'uploaded'});	
		}
		else{
			$("#DyedImg").attr({"src":src,"imgType":"sample"});
			$("#imgBox>.fa-times-circle").hide();
			$("#imgBox>.fa-upload").show();
		}
		$(this).addClass("on");
	}) 
	//파일올리는 
	$("#imgUploadBtn>#imgFile").on("change",function(event){
		//timer = setInterval(function(){console.log(flag);flag=true;},1000);
		let file = event.target.files;
		let fileReader = new FileReader();
			
		if(file[0].type.match("image/*")){
			let imgData;
			let src;
			fileReader.onload = function(e){
				src = e.target.result; 
				$("body").css({"overflow":"hidden"});
				if(parseFloat(window.innerWidth)>800){
					$("#jcropImg").css({"width":screen.width,"height":screen.height}).show();
				}else{
					$("#jcropImg").css({"width":window.innerWidth,"height":window.innerHeight}).show();
				}
				
                canvasDrawImage(src,function(){},true)
                .then((result,error)=>{
                    imgCropDesignate(result);
                })
			} 
			fileReader.readAsDataURL(file[0]);
			/* let formData = new FormData();
			formData.append('img_upload',file[0],file[0].name);	 */
			$("#colorListContainer label").removeClass("on");
			
			$("#checkBox").prop({"checked":false});
			$("#imgUploadBtn").css({"display":"none"});
			$("#colorList label").removeClass("on");
			$(this).val("");
		}
	})

	$("#cutBtn").on("click",function(event){
		imgCropApply();
	})

	$("#colorThicknessSelectWrap>div>label").on("click",function(e){
		const imgType = $("#originImg").attr("imgType");
		let src = $("#imgContainer>#imgBox>#DyedImg").attr("src");
		if(imgType=='sample'){
			if(src==undefined||src==null){e.preventDefault();//alert("사진을 올려주세요 ^오^");
			return false;}
			const originImgSrc = $("#originImg").attr("src");
			colorNum=$("#"+$("#colorListContainer .on").attr("for")).val();
			thickNum=$("#"+$(this).attr("for")).val();
			//alert(colorNum);alert(thickNum);
			const newSrc=originImgSrc.slice(0,originImgSrc.lastIndexOf("."))+"-"+colorNum+"-"+thickNum+".png";
			$("#imgContainer>#imgBox>#DyedImg").attr({"src":newSrc});
		}
		else{
			const id = $(this).attr("for"); 
			const val=$("#"+id).val();
			//alert(val);
			if(src==undefined||src==null){
				e.preventDefault();
				//alert("사진을 올려주세요 ^오^");
				return false;
			}
			//alert(src);
			let idx = src.lastIndexOf("-");
			let quoteIdx = src.lastIndexOf("?");
			//alert(quoteIdx);
			let newSrc;
			if(quoteIdx!=-1){
				newSrc= src.slice(0,idx+1)+val+src.slice(idx+2,quoteIdx);
			}else{newSrc=src.slice(0,idx+1)+val+src.slice(idx+2);}
			//alert(newSrc);
			//alert(newSrc);
			$("#imgContainer>#imgBox>#DyedImg").attr({"src":newSrc+"?"+Date.now()});
		}
	})
	//이미지 파일의 rgb 값을 base64 로 인코딩 해주기 위한 메서드
	convertBase64 = function(realArr){
		//realArr 은 str 형 배열이므로
		//charCodeAt 메서드를 사용하기 위해선 하나의 Str로 합쳐야함
		realArrToString=realArr.toString();
		let bytes=[];
		//우선 먼저 byte 화 해준다
		for(let i=0;i<realArr.length;i++){
			//realArr의 각 문자를 unicode로 바꿔줌
			bytes[i]=realArrToString.charCodeAt(i)&0xff;
		}

		console.log(bytes);
		//유니코드로 바뀐 애들을 charactor 로 바꿔준다.
		charactors = String.fromCharCode.apply(String,bytes);
		realArrBase64 =  btoa(charactors);
		
		return bytes;
	}

	$("#imgBox>i").on("click",function(){
		const className = this.getAttribute("class").substring(4);
 		//alert(className);
		const displayMode = $("#imgBox").attr("display_mode");
		if(displayMode=="half"){
			$("#imgBox").attr({"display_mode":"full"});
			$("#slideBar").css({"display":"none"});
			$("#slideImg").css({"display":"none"});
		}
		$("#imgUploadBtn").css({"display":"block"});
	})
	$("#imgUploadBtn>label").on("click",function(e){
		//alert("");
		const isChecked = $("#checkBox").prop("checked");
		if(!isChecked){e.preventDefault();return;}
	})

	function createBloB(uri,fileType){
		let decodeURI= atob(uri.split(',')[1]);
		
		const len=parseInt(decodeURI.length);
		let arr=[];

		for(let i = 0 ;i<len;i++){
			arr.push(decodeURI.charCodeAt(i));
		}
		return new Blob([new Uint8Array(arr)],{'type':fileType});

	}

	$("#colorList #colorListContainer label").on("click",async function(e){
		let imgType = $("#DyedImg").attr("imgType");
		$("#colorList label").removeClass("on");
		$(this).addClass("on");

		let src = $(this).children('img').attr("src");
		//alert(src);
		// $("#imgContainer>#imgBox>img").attr({"src":src});
		let h_value = $("#"+$(this).attr("for")).val();
		if(imgType=='sample'){
			const selectedImgSrc= $("#imgBtnList .on").attr("src");
			
			let colorNum=-1;let thickNum=0;
			if(h_value=='0'){colorNum=0;}
			else if(h_value==='20'){colorNum=1;}
			else if(h_value==='60'){colorNum=2;}
			else if(h_value==='90'){colorNum=3;}
			else if(h_value==='120'){colorNum=4;}
			else if(h_value==='150'){colorNum=5;}
			else{colorNum=6;}
			let pointIdx = selectedImgSrc.indexOf(".");
			/* 
			let slashIdx=selectedImgSrc.lastIndexOf("/");
			let pointIdx = selectedImgSrc.indexOf(".");
			const imgName = selectedImgSrc.slice(slashIdx+1,pointIdx);
			 */
			const newSrc = selectedImgSrc.slice(0,pointIdx)+"-"+colorNum+".png";
			
			//alert(newSrc);
			$("#downLink").attr({"href":newSrc});
			$("#DyedImg").attr("src",newSrc);
			return false;
		}else{
			let blobFile=createBloB(croppedImgURL,'image/png');
			
			//console.log(today_date);
			//console.log(flag);
			//console.log(seg_data);
			flag=true;
			
			let formData = new FormData();
			formData.append('input_image',blobFile,'imgFile');
			formData.append('target_color',h_value);
			formData.append('target_degree','120');
			//ajax에 배열을 넘기기 위해..
			$("#progressBarWrap").show();
			$("#progressMsgBar").show();
			// url:"http://169.56.92.19:9001/hair-dyeing",
			xhp=$.ajax({ 
				url:"/hair-dyeing",
				type:'post',
				traditional:true,
				contentType:false,
				processData:false,
					//cache:false,
				data: formData,
				xhr:function(){
					let tempXhr = new window.XMLHttpRequest();
					tempXhr.addEventListener("progress", function(event){
						if(event.lengthComputable){
							let percentage = (event.loaded/event.total);
							let percentagePix = $("#progressBarWrap").width()*percentage; 
							$("#progressBar").css({"width":percentagePix.toString()+"px"});
							console.log(percentagePix);
						}
					},false);
					tempXhr.addEventListener("readystatechange",function(e){
						let readyState = tempXhr.readyState;
						console.log("readyState : "+readyState);
						if(readyState>=0&&readyState<2){
							$("#stopAjaxBtn").show();
							$("#progressMsgBar").text("uploading..You may stop dyeing process now");
							$("#stopAjaxBtn").on("click",async function(e){
								e.preventDefault();
								console.log("readyState : "+xhp.readyState);
								if(tempXhr&&tempXhr.readyState<2){
									tempXhr.abort();
									await $("#loadDyedImg").hide();
									const src = $("#DyedImg").attr("src");
									await $("#DyedImg").show();
									$("#stopAjaxBtn").hide();
								}
							})
						}else{
							$("#stopAjaxBtn").hide();
							$("#progressMsgBar").text("uploaded. Now, hair-dyeing process begin");
						}
					},false)
					return tempXhr;
				},
				error: function(resp){
					console.log(resp);
					//alert("fail");
				},
				success:async function(resp){
					
					let imgSrc =resp['output_url'];
					
					await $("#DyedImg").attr({"src":imgSrc}).show();
					await $("#loadDyedImg").hide();
					//$("#downLink").attr({"href":src});
					//$("#DyedImg").show();
				},
				beforeSend:function(xhr,opts){
					
					$("#loadDyedImg").attr("src","/static/img/loading.gif").show();
					$("#DyedImg").hide();
				},
				complete:function(){
					$("#progressBar").css({"width":"0px"});
					$("#progressBarWrap").hide();
					$("#progressMsgBar").hide();
					flag=false;
					//alert(flag);
				}
			});
			
		}
	})
	
	$(".arrow").on("click",function(event){
		//right or left
		const thisId = $(this).attr("id");
		// colorBtnListContainer 인지 아닌지 여부
		const thisParentId = $(this).parent().attr("id");
		//console.log(thisParentId);
		
		const $upperElement = $("#"+thisParentId);
		let $ul;let len;
		if(thisParentId=='colorBtnListContainer'){
			$ul = $(this).siblings("ul");
			len = $(this).siblings("ul").find("li").length;
			if(thisId=='rightArr'){
				const $lastChild = $ul.children("li")[len-1];
				$upperElement.children('ul').prepend($lastChild)
			}else if(thisId=='leftArr'){
				const $lastChild = $ul.children("li")[0];
				$upperElement.children('ul').append($lastChild);
			}
		}
		
	})