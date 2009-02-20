var Model = new Class({
	Implements: Events,
	initialize: function(){
		this.db = []
		this.data_ready = false
		return this
	},
	
	get_data: function(){
		if (this.data_ready)
			this.fireEvent('dataReady', this)
		else
			new JsonP(
				this.json_url, 
				$merge(	{abortAfter : 1000, retries : 1, onComplete : this.process_data.bind(this) }, this.json_opts) 
			).request()
			
		return this
	},
	
	process_data: function(custom_name){
		this.db = this.db.map(function(row){
			row.model = this
			return row
		}, this)
		
		this.data_ready = true
		this.fireEvent('dataReady', this)
	},
	
	sort_by: function(field){
		return this._sort_by.cache(this)(field)
	},
	_sort_by: function(field){
		return this.db.sort(function(a,b){
			a[field] - b[field]
		})
	},
	new_items: function(){
		return this.db.filter(function(x){
			return x.is_new
		})
	},
	
	to_cells: function(limit){
		var limit = limit || 100
		this.cells = [this.title_elem].combine(this.db.map(function(row){ 
			if (limit > 1) {
				var cell = this._to_cell.apply(row)
				cell.element.hasClass('double-wide') ? limit -= 2 : --limit
				return cell.to_html()
			}
		}.bind(this))).flatten()
		
		return this.cells
	}
})

var Twitter = new Class({
	Extends: Model,
	
	json_url   : "http://search.twitter.com/search.json",
	// json_opts  : { data: { q : "from:" + current_user('twitter') } },
 	initial_limit : 15,	
  
  initialize: function(){
		return this.parent()
  },

	process_data: function(json){
		this.db = json.results.map(function(json_item){
			return {
				title       : json_item.text,
				created_on  : Date.parse(json_item.created_at),
				source      : "http://www.twitter.com/" + json_item.from_user + "/status/" + json_item.id,
				html        : json_item.text.make_urls_links().link_replies().link_hashcodes()
			}
	  }.bind(this))
	
		this.parent()
		return this.db
	},					
	
	_to_cell: function(){
		return new Cell(this.html, { 
			'main_class'	 : (this.title.length > 90) ? 'double-wide' : 'single-wide',
			'custom_class' : 'text tweet ' + (this.is_new ? 'new' : ''),
			'created_on'	 : this.created_on,
			'source'			 : this.source
		})
	}	
})

var GitHub = new Class({
	Extends: Model,
	
	web_source : "http://www.github.com/cliffmoon",
	json_url   : "http://github.com/cliffmoon.json",
	initial_limit : 10,

	initialize: function(){
		return this.parent()
	},
	
	process_data: function(json){
		this.db = json.map(function(json_item){
			return {
				html        : this._gen_html(json_item),
				source      : this._gen_source(json_item),
				created_on  : Date.parse(json_item.created_at),
				repository  : json_item.repository,
				type        : json_item.type
			}
		}.bind(this))
		
		this.db = this.db.filter(function(x){ return x.html })

		this.parent()
		return this.db
	},
	
	_gen_html: function(json_item){
		if (!json_item.repository) return
		switch(json_item.type) {
			case 'CommitEvent' :
				return json_item.actor + " commited to " + "<a href='" + json_item.repository.url + "'>" + json_item.repository.name + "</a>"; break;
			default : return; break;			
		}
	},
	
	_gen_source: function(json_item){
		if (!json_item.repository) return
		switch(json_item.type) {
			case 'CommitEvent' :
				return "http://github.com/cliffmoon/" + json_item.repository.name + "/commit/" + json_item.payload.commit; break;
			default : return; break;			
		}
	},
	
	_to_cell: function(){
		return new Cell(this.html, { 
			'main_class'	 : 'single-wide',
			'custom_class' : 'text ' + (this.is_new ? 'new' : ''),
			'created_on'	 : this.created_on,
			'source'			 : this.source
		})
	}
})

window.addEvent('domready', function(){
	new GitHub()
		.addEvent('dataReady', function(model){ 
			var rows = model.db.filter(function(x){ return x.type === 'CommitEvent' && x.repository.name == "dynomite" })
			if (rows && rows.length > 0)
				$('github-data').adopt([
					new Element('span', {'class':'github-data-group',html:'<span class="title">Latest Commit</span>' + rows.first().created_on.timeDiffInWords()}),
					new Element('span', {'class':'github-data-group',html:'<span class="title">Forks</span>'         + rows.first().repository.forks}),
					new Element('span', {'class':'github-data-group',html:'<span class="title">Watchers</span>'      + rows.first().repository.watchers})
				])
		})
		.get_data()
})