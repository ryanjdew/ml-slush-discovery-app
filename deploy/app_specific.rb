require 'lib/RoxyHttp'
#
# Put your custom functions in this class in order to keep the files under lib untainted
#
# This class has access to all of the private variables in deploy/lib/server_config.rb
#
# any public method you create here can be called from the command line. See
# the examples below for more information.
#
class ServerConfig

  #
  # You can easily "override" existing methods with your own implementations.
  # In ruby this is called monkey patching
  #
  # first you would rename the original method
  alias_method :original_deploy_modules, :deploy_modules

  # then you would define your new method
  def deploy_modules
    original_deploy_modules

    system %Q!mlpm deploy -u #{ @properties['ml.user'] } \
                      -p #{ @ml_password } \
                      -H #{ @properties['ml.server'] } \
                      -P #{ @properties['ml.app-port'] }!
  end

  alias_method :original_deploy_rest, :deploy_rest

  def deploy_rest
    optionFiles = Dir[ServerConfig.expand_path("../../../rest-api/config/options/all/*")]
    headers = {
      'Content-Type' => 'application/xml'
    }
    optionFiles.each { |filePath|
      file = open(filePath, "rb")
      contents = file.read
      searchOptionPart = File.basename(filePath, ".*")
      url = "http://#{@properties['ml.server']}:#{@properties['ml.app-port']}/v1/config/query/all/#{searchOptionPart}"
      puts url
      r = go(url, "PUT", headers, nil, contents)
      if (r.code.to_i < 200 && r.code.to_i > 206)
        @logger.error("code: #{r.code.to_i} body:#{r.body}")
      end
    }

    deploy_ext()
    deploy_transform()
  end
  #
  # you can define your own methods and call them from the command line
  # just like other roxy commands
  # ml local my_custom_method
  #
  # def my_custom_method()
  #   # since we are monkey patching we have access to the private methods
  #   # in ServerConfig
  #   @logger.info(@properties["ml.content-db"])
  # end

  #
  # to create a method that doesn't require an environment (local, prod, etc)
  # you woudl define a class method
  # ml my_static_method
  #
  # def self.my_static_method()
  #   # This method is static and thus cannot access private variables
  #   # but it can be called without an environment
  # end
end

#
# Uncomment, and adjust below code to get help about your app_specific
# commands included into Roxy help. (ml -h)
#

#class Help
#  def self.app_specific
#    <<-DOC.strip_heredoc
#
#      App-specific commands:
#        example       Installs app-specific alerting
#    DOC
#  end
#
#  def self.example
#    <<-DOC.strip_heredoc
#      Usage: ml {env} example [args] [options]
#
#      Runs a special example task against given environment.
#
#      Arguments:
#        this    Do this
#        that    Do that
#
#      Options:
#        --whatever=value
#    DOC
#  end
#end
