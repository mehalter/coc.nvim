import {equalChar} from '../util/index'
import { Neovim } from 'neovim'
import {getConfig} from '../config'
import {getSourceConfig} from '../config'
import {filterFuzzy, filterWord} from '../util/filter'
import {SourceOption,
  SourceConfig,
  VimCompleteItem,
  CompleteOption,
  CompleteResult} from '../types'
const logger = require('../util/logger')('model-source')

export default abstract class Source {
  public readonly name: string
  public readonly config: SourceConfig
  // exists opitonnal function names for remote source
  protected readonly optionalFns: string[]
  protected readonly nvim: Neovim
  constructor(nvim: Neovim, option: SourceOption) {
    let {name, optionalFns, only}  = option
    delete option.name
    delete option.optionalFns
    this.nvim = nvim
    this.optionalFns = optionalFns || []
    this.name = name
    ;['engross', 'noinsert', 'firstMatch'].forEach(name => {
      option[name] = option[name] == '0' ? false : !!option[name]
    })
    // user options
    let opt = getSourceConfig(name) || {}
    this.config = Object.assign({
      shortcut: name.slice(0, 3),
      priority: 0,
      engross: false,
      filetypes: null,
      noinsert: false,
      firstMatch: false
    }, option, opt)
    if (only) this.config.priority = 0
  }

  public get priority():number {
    return Number(this.config.priority)
  }

  public get noinsert():boolean {
    return !!this.config.noinsert
  }

  public get firstMatch():boolean {
    return !!this.config.firstMatch
  }

  public get isOnly():boolean {
    return this.config.only === true ? true : false
  }

  public get engross():boolean {
    return !!this.config.engross
  }

  public get filetypes():string[] | null {
    return this.config.filetypes
  }

  public get menu():string {
    let {shortcut} = this.config
    return `[${shortcut.slice(0,3).toUpperCase()}]`
  }

  protected convertToItems(list:any[], extra: any = {}):VimCompleteItem[] {
    let {menu} = this
    let res = []
    for (let item of list) {
      if (typeof item == 'string') {
        res.push(Object.assign({word: item, menu}, extra))
      }
      if (item.hasOwnProperty('word')) {
        if (item.menu) extra.info = item.menu
        res.push(Object.assign(item, {menu}, extra))
      }
    }
    return res
  }

  protected filterWords(words:string[], opt:CompleteOption):string[] {
    let res = []
    let {input} = opt
    let cword = opt.word
    let cFirst = input.length ? input[0] : null
    let icase = !/[A-Z]/.test(input)
    for (let word of words) {
      if (!cFirst) continue
      if (!word || word.length < 3) continue
      if (cFirst && !equalChar(word[0], cFirst, icase)) continue
      if (word == cword || word == input) continue
      res.push(word)
    }
    return res
  }

  public checkFileType(filetype: string):boolean {
    if (this.filetypes == null) return true
    return this.filetypes.indexOf(filetype) !== -1
  }

  // some source could overwrite it
  public async refresh():Promise<void> {
    // do nothing
  }

  public async onCompleteDone(item:VimCompleteItem):Promise<void> {
    // do nothing
  }

  public abstract shouldComplete(opt: CompleteOption): Promise<boolean>

  public abstract doComplete(opt: CompleteOption): Promise<CompleteResult | null>
}
